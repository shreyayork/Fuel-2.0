"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { prettyCohortKey } from "@/lib/benchmarks-format";
import { buildProfilePrefill } from "@/lib/onboard/build-profile-prefill";
import { fetchOnboardCohort } from "@/lib/onboard/cohort-client";
import { fetchCompanyHint, fetchOnboardCompanySearch, matchCompanyOption } from "@/lib/onboard/company-hint-client";
import type { CompanyHint } from "@/lib/onboard/company-hint-types";
import { domainFromEmail } from "@/lib/onboard/company-from-email";
import { minimalCrunchbaseProfile, parseEmailDomain } from "@/lib/onboard/map-enrichment-to-profile";
import { fetchOnboardProfileStream, type OnboardProfileStreamTarget } from "@/lib/onboard/stream-client";
import type { OnboardStreamError } from "@/lib/onboard/stream-client";
import {
  checkIsYorkClient,
  fetchYorkIeServicesStatus,
  shouldShowYorkProjectsStep,
  type YorkIeServicesStatus,
} from "@/lib/onboard/york-client";
import { uid } from "./constants";
import type {
  ChatMessage,
  OnboardingStep,
  OnboardingUserData,
  OnboardBenchmarkInputs,
  ProfileFormResult,
} from "./types";

export function useOnboardingChat(
  email: string,
  onComplete: (data: OnboardingUserData) => void,
  onEnrichmentError?: (error: OnboardStreamError) => void,
) {
  const domain = parseEmailDomain(email);
  const inferredDomain = useMemo(() => domainFromEmail(email), [email]);
  const isYorkClient = useMemo(() => checkIsYorkClient(email), [email]);

  const [companyHint, setCompanyHint] = useState<CompanyHint | null>(null);
  const [hintLoading, setHintLoading] = useState(true);
  const [yorkServicesStatus, setYorkServicesStatus] =
    useState<YorkIeServicesStatus | null>(null);
  const inferredCompanyName = companyHint?.name ?? "";
  const showYorkProjectsStep = useMemo(
    () => shouldShowYorkProjectsStep({ isYorkClient, servicesStatus: yorkServicesStatus }),
    [isYorkClient, yorkServicesStatus],
  );

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [step, setStep] = useState<OnboardingStep>("greeting");
  const [inputValue, setInputValue] = useState("");
  const [isTyping, setIsTyping] = useState(true);
  const [userData, setUserData] = useState<OnboardingUserData>({
    email,
    isYorkClient,
    companyName: "",
    teamSize: "",
    domain,
    verifiedDomain: inferredDomain,
    businessModel: null,
    profileNotes: "",
    linkedinUrl: "",
    fundingRounds: [],
    locationCity: "",
    locationState: "",
    locationCountry: "",
    crunchbaseData: null,
    enrichment: null,
    extracted: null,
    fieldSources: {},
    fieldConfidence: {},
    benchmarkHints: null,
    confirmedProfile: null,
    benchmarkInputs: null,
    cohortKey: null,
    cohortSampleSize: null,
    cohortBenchmarkRows: [],
    cohortInferred: null,
    allCohorts: [],
  });
  const [completedProgress, setCompletedProgress] = useState<Set<string>>(new Set());
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const processingRef = useRef(false);
  const greetedRef = useRef(false);
  const companyHintRef = useRef(companyHint);
  companyHintRef.current = companyHint;

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const hint = await fetchCompanyHint();
      if (cancelled) return;
      if (hint) {
        setCompanyHint(hint);
        setUserData((prev) => ({
          ...prev,
          companyName: hint.name ?? "",
          companyHintSource: hint.source,
          verifiedDomain: hint.domain || prev.verifiedDomain,
        }));
      }
      setHintLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const status = await fetchYorkIeServicesStatus(email);
      if (!cancelled) setYorkServicesStatus(status);
    })();
    return () => {
      cancelled = true;
    };
  }, [email]);

  useEffect(() => {
    if (hintLoading) return;
    setStep(inferredCompanyName ? "company-confirm" : "company-name");
  }, [hintLoading, inferredCompanyName]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  const pushMessage = useCallback((msg: Omit<ChatMessage, "id">) => {
    setMessages((prev) => [...prev, { ...msg, id: uid() }]);
  }, []);

  const aiSay = useCallback(
    (
      text: string,
      opts?: {
        chips?: ChatMessage["chips"];
        cardType?: ChatMessage["cardType"];
        delay?: number;
      },
    ): Promise<void> =>
      new Promise((resolve) => {
        setIsTyping(true);
        setTimeout(() => {
          setIsTyping(false);
          pushMessage({
            role: "ai",
            text,
            chips: opts?.chips,
            cardType: opts?.cardType,
          });
          resolve();
        }, opts?.delay ?? 900);
      }),
    [pushMessage],
  );

  const disableLastChips = useCallback(() => {
    setMessages((prev) =>
      prev.map((m, i) =>
        i === prev.length - 1 ? { ...m, disabled: true, chips: undefined } : m,
      ),
    );
  }, []);

  const startProfileLoad = useCallback(
    async (
      companyName: string,
      opts?: {
        authoritativeName?: boolean;
        enrichmentTarget?: OnboardProfileStreamTarget;
      },
    ) => {
      if (processingRef.current) return;
      processingRef.current = true;
      setUserData((prev) => ({ ...prev, companyName }));

      const hintSource = companyHintRef.current?.source;
      const passNameToPrefill =
        opts?.authoritativeName === true ||
        hintSource === "override" ||
        hintSource === "fuel-data";

      let enrichmentTarget = opts?.enrichmentTarget;
      if (!enrichmentTarget && opts?.authoritativeName) {
        const candidates = await fetchOnboardCompanySearch(companyName);
        const match = matchCompanyOption(companyName, candidates);
        if (match) {
          enrichmentTarget = {
            companyId: match.id,
            companyDomain: match.domain || undefined,
          };
        }
      } else if (!enrichmentTarget && companyHintRef.current?.fuelDataUuid) {
        enrichmentTarget = {
          companyId: companyHintRef.current.fuelDataUuid,
          companyDomain: companyHintRef.current.domain,
        };
      }

      await aiSay(
        `Great. I'll piece together a quick Fuel profile for **${companyName}** from your website and Crunchbase.`,
        { delay: 500 },
      );
      setStep("crunchbase-fetching");
      setIsTyping(true);

      const { payload, error: streamError } = await fetchOnboardProfileStream(
        {},
        enrichmentTarget,
      );
      setIsTyping(false);

      if (streamError?.kind === "blocked_provider" || streamError?.kind === "already_has_account") {
        onEnrichmentError?.(streamError);
        processingRef.current = false;
        return;
      }

      const enrichmentDomain =
        enrichmentTarget?.companyDomain?.trim() ||
        payload?.enrichment.domain ||
        domain;

      if (payload) {
        const prefill = buildProfilePrefill({
          enrichment: payload.enrichment,
          extracted: payload.extracted,
          companyName: passNameToPrefill ? companyName : undefined,
          domain: enrichmentDomain,
        });
        setUserData((prev) => ({
          ...prev,
          companyName: prefill.crunchbaseProfile.name || companyName,
          crunchbaseData: prefill.crunchbaseProfile,
          enrichment: payload.enrichment,
          extracted: payload.extracted,
          benchmarkHints: payload.benchmarkHints,
          businessModel: prefill.businessModel,
          linkedinUrl: prefill.linkedinUrl,
          locationCity: prefill.location.city,
          locationState: prefill.location.state,
          locationCountry: prefill.location.country,
          fieldSources: prefill.fieldSources,
          fieldConfidence: prefill.fieldConfidence,
          verifiedDomain: enrichmentDomain,
        }));
      } else {
        setUserData((prev) => ({
          ...prev,
          crunchbaseData: minimalCrunchbaseProfile({
            companyName,
            teamSize: "",
            domain: enrichmentDomain,
          }),
          verifiedDomain: enrichmentDomain,
          fieldSources: {},
          fieldConfidence: {},
        }));
      }

      await aiSay("", { delay: 500, cardType: "profile-form" });
      processingRef.current = false;
    },
    [aiSay, domain, onEnrichmentError],
  );

  useEffect(() => {
    if (hintLoading || greetedRef.current) return;
    greetedRef.current = true;
    setIsTyping(true);
    const t = setTimeout(() => {
      setIsTyping(false);
      if (!inferredCompanyName) {
        pushMessage({
          role: "ai",
          text: `👋 Hi! I'm Fuel AI, York IE's onboarding assistant.\n\nYou're signed in as **${email}**. What company should I set up in Fuel?`,
        });
        setStep("company-name");
        setTimeout(() => inputRef.current?.focus(), 100);
        return;
      }

      const greeting = isYorkClient
        ? `👋 Hi! I'm Fuel AI, York IE's onboarding assistant.\n\nYou're signed in as **${email}**, and I can see you're part of the York IE family. I found **${inferredCompanyName}** from your email domain.\n\nIs this the company you want to set up in Fuel?`
        : `👋 Hi! I'm Fuel AI, York IE's onboarding assistant.\n\nYou're signed in as **${email}**, so I found **${inferredCompanyName}** from your email domain.\n\nIs this the company you want to set up in Fuel?`;

      pushMessage({
        role: "ai",
        text: greeting,
        chips: [{ label: `Yes, set up ${inferredCompanyName}`, value: "confirm-company" }],
      });
      setStep("company-confirm");
    }, 500);
    return () => clearTimeout(t);
  }, [email, hintLoading, inferredCompanyName, isYorkClient, pushMessage]);

  const handleCompanyConfirm = useCallback(
    async (value: string) => {
      if (processingRef.current || value !== "confirm-company") return;
      disableLastChips();
      const name = userData.companyName || inferredCompanyName;
      pushMessage({ role: "user", text: `Yes, set up ${name}` });
      await startProfileLoad(name);
    },
    [disableLastChips, inferredCompanyName, pushMessage, startProfileLoad, userData.companyName],
  );

  const handleCompanyNameSubmit = useCallback(
    async (name: string) => {
      if (processingRef.current) return;
      pushMessage({ role: "user", text: name });
      await startProfileLoad(name, { authoritativeName: true });
    },
    [pushMessage, startProfileLoad],
  );

  const handleProfileFormSubmit = useCallback(
    async (result: ProfileFormResult) => {
      if (processingRef.current) return;
      processingRef.current = true;
      setUserData((prev) => ({
        ...prev,
        companyName: result.companyName,
        businessModel: result.businessModel,
        profileNotes: result.notes,
        confirmedProfile: result,
        verifiedDomain: result.domain,
        linkedinUrl: result.linkedin,
        fundingRounds: result.fundingRounds,
        locationCity: result.city,
        locationState: result.region,
        locationCountry: result.country,
        crunchbaseData: prev.crunchbaseData
          ? {
              ...prev.crunchbaseData,
              name: result.companyName,
              description: result.description,
              category: result.industry,
              founded: result.founded,
              location: [result.city, result.region, result.country].filter(Boolean).join(", "),
              website: result.website || result.domain,
            }
          : null,
      }));
      setCompletedProgress((prev) => new Set([...prev, "profile"]));
      pushMessage({ role: "user", text: `Claim ${result.domain}` });

      setIsTyping(true);
      const cohortResolution = await fetchOnboardCohort({
        industry: result.industry,
        locationCountry: result.country,
        lastFundingType: userData.enrichment?.lastFundingType,
        fundingRounds: result.fundingRounds,
      });

      if (cohortResolution) {
        setUserData((prev) => ({
          ...prev,
          cohortKey: cohortResolution.cohortKey,
          cohortSampleSize: cohortResolution.sampleSize,
          cohortBenchmarkRows: cohortResolution.benchmarkRows,
          cohortInferred: cohortResolution.inferred,
          allCohorts: cohortResolution.allCohorts,
        }));
      }

      const cohortLabel = cohortResolution?.cohortKey
        ? prettyCohortKey(cohortResolution.cohortKey)
        : "your peer group";

      await aiSay(
        `Perfect. Your Fuel profile is ready.\n\nHere's the benchmark picture for **${cohortLabel}** — the cohort your business maps to.\n\nAcross the York IE portfolio and aggregated market data, the gap between median and top-quartile performance comes down to one thing: **operating clarity**. Add your numbers below so Fuel can map exactly where you stand.`,
        { delay: 900 },
      );
      await aiSay("", { delay: 500, cardType: "benchmark" });
      setStep("benchmark");
      processingRef.current = false;
    },
    [aiSay, pushMessage, userData.enrichment?.lastFundingType],
  );

  const handleCohortChange = useCallback(
    async (cohortKey: string) => {
      const profile = userData.confirmedProfile;
      if (!profile || !cohortKey) return;

      const cohortResolution = await fetchOnboardCohort({
        industry: profile.industry,
        locationCountry: profile.country,
        lastFundingType: userData.enrichment?.lastFundingType,
        fundingRounds: profile.fundingRounds,
        cohortKeyOverride: cohortKey,
      });

      if (!cohortResolution) return;

      setUserData((prev) => ({
        ...prev,
        cohortKey: cohortResolution.cohortKey,
        cohortSampleSize: cohortResolution.sampleSize,
        cohortBenchmarkRows: cohortResolution.benchmarkRows,
        cohortInferred: cohortResolution.inferred,
        allCohorts: cohortResolution.allCohorts,
      }));
    },
    [userData.confirmedProfile, userData.enrichment?.lastFundingType],
  );

  const handleBenchmarkSave = useCallback(
    (inputs: OnboardBenchmarkInputs | null) => {
      setUserData((prev) => ({ ...prev, benchmarkInputs: inputs }));
    },
    [],
  );

  const handleBenchmarkContinue = useCallback(async () => {
    if (processingRef.current) return;
    processingRef.current = true;
    setCompletedProgress((prev) => new Set([...prev, "benchmarks"]));
    await aiSay(
      "Now let me show you how Fuel helps turn those benchmark gaps into operating signals and action.",
      { delay: 700, cardType: "value-prop" },
    );
    setStep("fuel-value");
    processingRef.current = false;
  }, [aiSay]);

  const showLaunchStep = useCallback(
    async (opts: { includeYorkProjectContext: boolean }) => {
      const message = opts.includeYorkProjectContext
        ? "Your setup context is ready. Fuel will combine your company profile, benchmark cohort, and York IE project context to generate your first signal view."
        : "Your setup context is ready. Fuel will combine your company profile and benchmark cohort to generate your first signal view.";
      await aiSay(message, {
        delay: 800,
        chips: [{ label: "Start my journey", value: "launch" }],
      });
      setCompletedProgress((prev) => new Set([...prev, "config"]));
      setStep("platform-overview");
    },
    [aiSay],
  );

  const handleValuePropContinue = useCallback(async () => {
    if (processingRef.current) return;
    processingRef.current = true;
    setCompletedProgress((prev) => new Set([...prev, "tracks"]));

    if (showYorkProjectsStep) {
      await aiSay(
        "Because you're already a York IE customer, your York workspace is connected automatically. Here are the active projects Fuel will use to generate your signals.",
        { delay: 900, cardType: "york-projects" },
      );
      setStep("york-link");
    } else if (userData.isYorkClient) {
      setCompletedProgress((prev) => new Set([...prev, "integrations"]));
      await showLaunchStep({ includeYorkProjectContext: false });
    } else {
      await aiSay(
        "Fuel tracks everything — but York IE moves the numbers. Here's how their team works across the same four tracks you just saw.",
        { delay: 900, cardType: "york-services" },
      );
      setStep("york-services");
    }
    processingRef.current = false;
  }, [aiSay, showLaunchStep, showYorkProjectsStep, userData.isYorkClient]);

  const handleYorkProjectsContinue = useCallback(async () => {
    if (processingRef.current) return;
    processingRef.current = true;
    pushMessage({ role: "user", text: "Use these projects for signals" });
    setCompletedProgress((prev) => new Set([...prev, "integrations"]));
    await showLaunchStep({ includeYorkProjectContext: true });
    processingRef.current = false;
  }, [pushMessage, showLaunchStep]);

  const handleYorkServicesResponse = useCallback(
    async (val: "york-yes" | "york-skip") => {
      if (processingRef.current) return;
      processingRef.current = true;
      setCompletedProgress((prev) => new Set([...prev, "integrations"]));
      if (val === "york-yes") {
        pushMessage({ role: "user", text: "I want York IE on my team →" });
        await aiSay(
          "That's the right call. 🎉\n\nYour York IE Customer Success team will be in touch to match you with the right practitioners.",
          { delay: 900 },
        );
      } else {
        pushMessage({ role: "user", text: "Continue to Fuel →" });
        await aiSay(
          "Understood — York IE is always available from your workspace when you're ready.",
          { delay: 800 },
        );
      }
      await showLaunchStep({ includeYorkProjectContext: false });
      processingRef.current = false;
    },
    [aiSay, pushMessage, showLaunchStep],
  );

  const handleLaunch = useCallback(() => {
    disableLastChips();
    pushMessage({ role: "user", text: "Start my journey" });
    setStep("claiming");
    setTimeout(() => onComplete(userData), 600);
  }, [disableLastChips, onComplete, pushMessage, userData]);

  const handleSend = useCallback(() => {
    const val = inputValue.trim();
    if (!val || processingRef.current) return;
    setInputValue("");
    if (step === "company-name") void handleCompanyNameSubmit(val);
  }, [handleCompanyNameSubmit, inputValue, step]);

  const handleChipClick = useCallback(
    (value: string) => {
      if (processingRef.current) return;
      if (step === "company-confirm") void handleCompanyConfirm(value);
      else if (step === "platform-overview") handleLaunch();
    },
    [handleCompanyConfirm, handleLaunch, step],
  );

  return {
    messages,
    step,
    inputValue,
    setInputValue,
    isTyping,
    userData,
    completedProgress,
    messagesEndRef,
    inputRef,
    inputActive: step === "company-name",
    handleSend,
    handleChipClick,
    handleProfileFormSubmit,
    handleCohortChange,
    handleBenchmarkSave,
    handleBenchmarkContinue,
    handleValuePropContinue,
    handleYorkProjectsContinue,
    handleYorkServicesResponse,
    showYorkProjectsStep,
  };
}
