"use client";

import { useMemo } from "react";
import { prettyCohortKey } from "@/lib/benchmarks-format";
import { OnboardingShellHeader } from "../OnboardingShellHeader";
import {
  onboardChatInput,
  onboardFullScreenOverlay,
  onboardShellFrame,
  chatBubble,
  chatChipButton,
} from "../styles";
import { SIGNAL, accentGradient, onAccentText } from "@/lib/theme";
import {
  BenchmarkCard,
  ProfileFormCard,
  ValuePropCard,
  YorkProjectsCard,
  YorkServicesCard,
} from "./cards";
import { ProgressSidebar } from "./ProgressSidebar";
import { AIAvatar, MarkdownText, TypingDots } from "./primitives";
import type { useOnboardingChat } from "./useOnboardingChat";

type ChatFlow = ReturnType<typeof useOnboardingChat>;

export function OnboardingChatView({
  flow,
  onManual,
}: {
  flow: ChatFlow;
  onManual: () => void;
}) {
  const {
    messages,
    step,
    inputValue,
    setInputValue,
    isTyping,
    userData,
    completedProgress,
    messagesEndRef,
    inputRef,
    inputActive,
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
  } = flow;

  const cohortLabel = useMemo(
    () =>
      userData.cohortKey
        ? prettyCohortKey(userData.cohortKey)
        : "your peer group",
    [userData.cohortKey],
  );

  const canSend = inputActive && inputValue.trim().length > 0;

  return (
    <div style={onboardFullScreenOverlay()}>
      <div style={onboardShellFrame()}>
        <OnboardingShellHeader
          badge="ONBOARDING"
          onAction={onManual}
          actionLabel="Set up later →"
        />

        <div
          style={{ flex: 1, display: "flex", overflow: "hidden", minHeight: 0 }}
        >
          <div
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              minWidth: 0,
              background: SIGNAL.shell,
            }}
          >
            <div
              style={{ flex: 1, overflowY: "auto", padding: "24px 0" }}
              role="log"
              aria-live="polite"
              aria-relevant="additions"
            >
              <div
                style={{
                  margin: "0 auto",
                  padding: "0 24px",
                  display: "flex",
                  flexDirection: "column",
                  gap: 16,
                }}
              >
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className="fuel-onboard-msg"
                    style={{
                      display: "flex",
                      flexDirection:
                        msg.role === "user" ? "row-reverse" : "row",
                      alignItems: "flex-start",
                      gap: 10,
                    }}
                  >
                    {msg.role === "ai" ? <AIAvatar /> : null}
                    <div
                      style={{
                        maxWidth: "85%",
                        display: "flex",
                        flexDirection: "column",
                        gap: 6,
                      }}
                    >
                      {msg.text ? (
                        <div style={chatBubble(msg.role)}>
                          <MarkdownText text={msg.text} />
                        </div>
                      ) : null}

                      {msg.cardType === "profile-form" &&
                      userData.crunchbaseData ? (
                        <ProfileFormCard
                          data={userData.crunchbaseData}
                          businessModel={userData.businessModel}
                          notes={userData.profileNotes}
                          domain={userData.verifiedDomain || userData.domain}
                          linkedinUrl={userData.linkedinUrl}
                          locationCity={userData.locationCity}
                          locationState={userData.locationState}
                          locationCountry={userData.locationCountry}
                          fieldSources={userData.fieldSources}
                          fieldConfidence={userData.fieldConfidence}
                          enrichment={userData.enrichment}
                          extracted={userData.extracted}
                          onSubmit={handleProfileFormSubmit}
                        />
                      ) : null}
                      {msg.cardType === "benchmark" ? (
                        <BenchmarkCard
                          stage={
                            userData.benchmarkHints?.journeyStage ??
                            userData.crunchbaseData?.stage ??
                            ""
                          }
                          cohortKey={userData.cohortKey}
                          cohortLabel={cohortLabel}
                          cohortSampleSize={userData.cohortSampleSize}
                          cohortBenchmarkRows={userData.cohortBenchmarkRows}
                          allCohorts={userData.allCohorts}
                          businessModel={userData.confirmedProfile?.businessModel ?? userData.businessModel}
                          benchmarkHints={userData.benchmarkHints}
                          benchmarkInputs={userData.benchmarkInputs}
                          totalFundingUsd={
                            userData.enrichment?.totalFundingUsd ?? null
                          }
                          onCohortChange={handleCohortChange}
                          onSave={handleBenchmarkSave}
                          onContinue={handleBenchmarkContinue}
                        />
                      ) : null}
                      {msg.cardType === "value-prop" ? (
                        <ValuePropCard
                          cohortLabel={cohortLabel}
                          onContinue={handleValuePropContinue}
                        />
                      ) : null}
                      {msg.cardType === "york-services" ? (
                        <YorkServicesCard
                          onChoice={handleYorkServicesResponse}
                        />
                      ) : null}
                      {msg.cardType === "york-projects" && showYorkProjectsStep ? (
                        <YorkProjectsCard
                          onContinue={handleYorkProjectsContinue}
                        />
                      ) : null}
                      {msg.chips && !msg.disabled ? (
                        <div
                          style={{
                            display: "flex",
                            flexWrap: "wrap",
                            gap: 7,
                            marginTop: 2,
                          }}
                          role="group"
                          aria-label="Quick replies"
                        >
                          {msg.chips.map((chip) => (
                            <button
                              key={chip.value}
                              type="button"
                              className="fuel-onboard-chip"
                              onClick={() => handleChipClick(chip.value)}
                              style={chatChipButton()}
                            >
                              {chip.label}
                            </button>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  </div>
                ))}

                {isTyping ? (
                  <div
                    className="fuel-onboard-msg"
                    style={{ display: "flex", gap: 10 }}
                  >
                    <AIAvatar />
                    <div
                      style={{
                        ...chatBubble("ai"),
                        padding: 0,
                      }}
                    >
                      <TypingDots />
                    </div>
                  </div>
                ) : null}
                <div ref={messagesEndRef} />
              </div>
            </div>

            <div
              style={{
                borderTop: `1px solid ${SIGNAL.borderSubtle}`,
                background: SIGNAL.panel,
                padding: "14px 24px",
                display: "flex",
                gap: 10,
                alignItems: "center",
              }}
            >
              <input
                ref={inputRef}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSend()}
                disabled={!inputActive}
                placeholder={
                  inputActive
                    ? "Enter your company name..."
                    : "Use the options above to continue..."
                }
                aria-label="Company name"
                style={onboardChatInput(inputActive)}
              />
              <button
                type="button"
                onClick={handleSend}
                disabled={!canSend}
                className="fuel-onboard-send"
                aria-label="Send message"
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 8,
                  flexShrink: 0,
                  background: canSend
                    ? accentGradient()
                    : "rgba(255,255,255,0.06)",
                  border: "none",
                  cursor: inputActive ? "pointer" : "default",
                  fontSize: 15,
                  color: canSend ? onAccentText() : SIGNAL.mutedSoft,
                }}
              >
                →
              </button>
            </div>
          </div>

          <ProgressSidebar
            step={step}
            completedProgress={completedProgress}
            showYorkProjectsStep={showYorkProjectsStep}
          />
        </div>
      </div>
    </div>
  );
}
