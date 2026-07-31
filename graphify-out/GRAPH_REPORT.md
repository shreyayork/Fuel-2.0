# Graph Report - /app/projects/fuel  (2026-07-27)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 3748 nodes · 8687 edges · 191 communities (146 shown, 45 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 141 edges (avg confidence: 0.67)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `0772aadf`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- live-browser.js
- FuelOnboardingChat.tsx
- checks.mjs
- AccountSettings.tsx
- PatriotPayJourney.tsx
- ScorecardV2.tsx
- cn
- index.mjs
- setLiveState
- resumeSession
- design_system.py
- modern-screenshot.umd.js
- OnboardingMotionGraphics.tsx
- live-inject.mjs
- initPageChat
- sidebar.tsx
- live-commit-manual-edits.mjs
- yorkIeUpsell.ts
- detect-html.mjs
- design-system.mjs
- impeccable-config.mjs
- hook-lib.mjs
- el
- live-server.mjs
- extract-import-map.mjs
- OnboardingFlow.tsx
- merge-batch-graphs.py
- css-cascade.mjs
- detect-antipatterns-browser.js
- manual-apply.mjs
- hook-admin.mjs
- hook-before-edit.mjs
- utils.ts
- live-wrap.mjs
- svelte-component.mjs
- design-parser.mjs
- detect-antipatterns.mjs
- live-accept.mjs
- live-copy-edit-agent.mjs
- PatriotPayJourneyInner
- investorData.ts
- dependencies
- live-manual-edit-evidence.mjs
- AskFuelChat.tsx
- OnboardingWizard
- intelligenceFilters.ts
- documentRefForElement
- live-poll.mjs
- InvestorDashboard.tsx
- enrichCategoryData
- trackQuestions.ts
- initGlobalBar
- handleManualEditActivity
- insert-ui.mjs
- analyzeVisualContrastCandidate
- manual-edit-routes.mjs
- ScorecardV2
- context.mjs
- parseRgb
- buildTrackInsightLists
- runHook
- onAnnotDown
- scan-project.mjs
- command.tsx
- readLiveServerInfo
- impeccable-paths.mjs
- getBenchmarkTierStyle
- InitiativeDetailDrawer
- launchpad-cloud-deploy-run.util.mjs
- collectBrowserFindings
- resolveLengthPx
- GENERIC_FONTS
- FuelOnboardingChat
- parseAnyColor
- menubar.tsx
- resolveContext
- sampleCssBackground
- refreshParamsPanel
- package.json
- dropdown-menu.tsx
- buildCategoryData
- context-signals.mjs
- StaticElement
- event-validation.mjs
- carousel.tsx
- form.tsx
- critique-storage.mjs
- popover.tsx
- formatUsdCompact
- live.mjs
- ui-core.mjs
- session-store.mjs
- compute-batches.mjs
- discoverTargetCandidates
- palette.mjs
- pin.mjs
- chart.tsx
- select.tsx
- IntegrationSetupPage.tsx
- investGeography.ts
- buildMetricGroups
- OverviewFullSummaryPage
- resolveWorkspaceProjectRoot
- inline-ignores.mjs
- normalizeIgnoreValueEntries
- syncEditBadgeHitProxies
- load_graph
- navigation-menu.tsx
- formatBenchmarkDisplay
- serializeFindings
- devDependencies
- App.tsx
- DealPipelineSection
- buildOverviewWikiSummary
- launchpad-cloud-deploy-run.sh
- readWorkspacePatterns
- expandScanTargets
- buildPortfolioCompanyView
- dismissRecActionsTip
- checkElementGptBorderShadowDOM
- live-target.mjs
- extract-structure.mjs
- toggle-group.tsx
- signalCatalog.ts
- figma
- checkElementTextOverflowDOM
- countActiveDocuments
- IntelligenceLogForm
- isGeneratedFile
- build-fingerprints.mjs
- user-story-template.py
- peerDependencies
- alert.tsx
- input-otp.tsx
- evaluateSourceIntelligenceGeneration
- InitiativeDueQuarterField
- InitiativeMilestoneRow
- detect.mjs
- writeAuditLog
- renderBoldText
- launchpad-cloud-deploy-run.util.test.mjs
- PortfoliosPage
- class-variance-authority
- clsx
- cmdk
- date-fns
- embla-carousel-react
- @emotion/react
- input-otp
- lucide-react
- motion
- next-themes
- @popperjs/core
- @radix-ui/react-accordion
- @radix-ui/react-alert-dialog
- @radix-ui/react-avatar
- @radix-ui/react-checkbox
- @radix-ui/react-collapsible
- @radix-ui/react-context-menu
- @radix-ui/react-dialog
- @radix-ui/react-dropdown-menu
- @radix-ui/react-hover-card
- @radix-ui/react-label
- @radix-ui/react-menubar
- @radix-ui/react-navigation-menu
- @radix-ui/react-popover
- @radix-ui/react-slider
- @radix-ui/react-slot
- @radix-ui/react-switch
- @radix-ui/react-toggle
- @radix-ui/react-toggle-group
- @radix-ui/react-tooltip
- react-day-picker
- react-dnd-html5-backend
- react-hook-form
- react-popper
- react-resizable-panels
- react-responsive-masonry
- react-router
- react-slick
- recharts
- sonner
- tailwind-merge
- tw-animate-css
- linkedInTeamDistribution

## God Nodes (most connected - your core abstractions)
1. `cn()` - 223 edges
2. `el()` - 56 edges
3. `runHook()` - 32 edges
4. `PatriotPayJourneyInner()` - 32 edges
5. `setLiveState()` - 29 edges
6. `detectHtml()` - 28 edges
7. `initGlobalBar()` - 28 edges
8. `handleKeyDown()` - 27 edges
9. `collectBrowserFindings()` - 26 edges
10. `buildInsertConfigureRow()` - 26 edges

## Surprising Connections (you probably didn't know these)
- `FuelOnboardingChat()` --indirect_call--> `el()`  [INFERRED]
  src/app/FuelOnboardingChat.tsx → .cursor/skills/impeccable/scripts/live-browser.js
- `SidebarProvider()` --indirect_call--> `handleKeyDown()`  [INFERRED]
  src/app/components/ui/sidebar.tsx → .cursor/skills/impeccable/scripts/live-browser.js
- `CategoryDetailInitiativesWidget()` --indirect_call--> `init()`  [INFERRED]
  src/app/ScorecardV2.tsx → .cursor/skills/impeccable/scripts/live-browser.js
- `CrunchbaseCard()` --indirect_call--> `v()`  [INFERRED]
  src/app/FuelOnboardingChat.tsx → .cursor/skills/impeccable/scripts/modern-screenshot.umd.js
- `OnboardingWizard()` --indirect_call--> `v()`  [INFERRED]
  src/app/FuelOnboardingChat.tsx → .cursor/skills/impeccable/scripts/modern-screenshot.umd.js

## Import Cycles
- 3-file cycle: `src/app/OnboardingFlow.tsx -> src/app/PatriotPayJourney.tsx -> src/app/ScorecardV2.tsx -> src/app/OnboardingFlow.tsx`

## Communities (191 total, 45 thin omitted)

### Community 0 - "live-browser.js"
Cohesion: 0.03
Nodes (134): acceptedDomAlreadyClean(), applyPlaceholderSizingStyles(), applySvelteComponentVariantStyle(), attachSteerFocusGuard(), averageRgb01(), bufferToBase64(), buildCollapsible(), buildColorModels() (+126 more)

### Community 1 - "FuelOnboardingChat.tsx"
Cohesion: 0.02
Nodes (88): BENCH_INTEL_SIGNALS, BENCHMARK_PERCENTILES, BENCHMARK_TIER_PALETTE, BenchmarkAnalysis, BenchmarkGroupDef, BenchmarkSnapshot, BenchmarkTier, BenchmarkValues (+80 more)

### Community 2 - "checks.mjs"
Cohesion: 0.05
Nodes (98): borderColorsFromStyle(), borderWidthsFromStyle(), checkClippedOverflow(), checkColors(), checkCreamPalette(), checkElementAIPaletteDOM(), checkElementClippedOverflow(), checkElementClippedOverflowDOM() (+90 more)

### Community 3 - "AccountSettings.tsx"
Cohesion: 0.06
Nodes (80): AccountProfileTab(), AccountSettings(), AccountSettingsPlaceholder(), AccountUsageTab(), ActionUsageRow, buildActionBreakdown(), buildTopUpPurchases(), buildUsageRows() (+72 more)

### Community 4 - "PatriotPayJourney.tsx"
Cohesion: 0.02
Nodes (59): applyFuelTheme(), BENCHMARK_COHORT_ROWS, BENCHMARK_FIELD_COHORT, BenchmarkSubmission, DATA_ROOM_DOCUMENT_TYPES, DataRoomDocumentSlot, DataRoomDocumentTypeId, DataRoomFile (+51 more)

### Community 5 - "ScorecardV2.tsx"
Cohesion: 0.03
Nodes (66): suggestPlaybooksForStage(), AdvisorRecAction, ALL_BENCHMARK_METRIC_KEYS, BASE_METRIC_PLAYBOOKS, BENCHMARK_INTEL_KEY_TO_CATEGORY, BenchmarkDrilldownView(), BenchmarkEditDrawer(), buildMetricPlaybooksMap() (+58 more)

### Community 6 - "cn"
Cohesion: 0.05
Nodes (51): AccordionContent(), AccordionItem(), AccordionTrigger(), Avatar(), AvatarFallback(), AvatarImage(), BreadcrumbEllipsis(), BreadcrumbItem() (+43 more)

### Community 7 - "index.mjs"
Cohesion: 0.06
Nodes (68): addBrowserFindings(), addVisualContrastFindings(), addVisualContrastResult(), analyzeVisualContrast(), analyzeVisualContrastCandidate(), blendRgba(), browserColorsClose(), browserDesignSystemConfig() (+60 more)

### Community 8 - "setLiveState"
Cohesion: 0.09
Nodes (69): abortSvelteComponentInjection(), applyEditing(), buildLocatorForLeaf(), buildPickedAnchorSnapshot(), cancelEditing(), cancelEditingToPicking(), cancelInsertConfigure(), cleanup() (+61 more)

### Community 9 - "resumeSession"
Cohesion: 0.07
Nodes (62): applyOriginalAttrsToSvelteAnchor(), applySavedSessionMeta(), buildInsertPlaceholderSnapshotFromDom(), checkpointPayload(), clampVariantIndex(), clearHandled(), commitAcceptedSvelteComponentToDom(), elementMatchesOriginalMarkup() (+54 more)

### Community 10 - "design_system.py"
Cohesion: 0.06
Nodes (42): BM25, detect_domain(), _load_csv(), Lowercase, split, remove punctuation, filter short words, Build BM25 index from documents, Score all documents against query, Load CSV and return list of dicts, Core search function using BM25 (+34 more)

### Community 11 - "modern-screenshot.umd.js"
Cohesion: 0.09
Nodes (53): ae(), be(), bt(), Ce(), Ct(), de(), dt(), _e() (+45 more)

### Community 12 - "OnboardingMotionGraphics.tsx"
Cohesion: 0.04
Nodes (43): Answers, BENCHMARK_METRICS, BenchmarkExcitementPanel(), BenchmarkMetricGroup, BenchmarkTeaserPhase, BUILD_STAGE_MEANINGS, CAT_STYLE, CONSTRAINT_SUMMARIES (+35 more)

### Community 13 - "live-inject.mjs"
Cohesion: 0.07
Nodes (50): detectCsp(), INLINE_HEADER_SIGNALS, LAYOUT_EXTS, MONOREPO_HELPER_SIGNALS, NUXT_ROUTE_RULES_SIGNALS, NUXT_SECURITY_SIGNALS, SCAN_EXTS, SKIP_DIRS (+42 more)

### Community 14 - "initPageChat"
Cohesion: 0.09
Nodes (46): applyGlobalBarLabelState(), armPageChatForTyping(), attachSteerFocusDebug(), buildSteerProcessingDots(), clearSteerAwaitTimer(), collapsePageChat(), configureVoiceContext(), expandPageChat() (+38 more)

### Community 15 - "sidebar.tsx"
Cohesion: 0.05
Nodes (42): Input(), Separator(), Sheet(), SheetContent(), SheetDescription(), SheetFooter(), SheetHeader(), SheetOverlay() (+34 more)

### Community 16 - "live-commit-manual-edits.mjs"
Cohesion: 0.10
Nodes (50): allEntryIds(), argVal(), buildRepairBatch(), candidatesForEntry(), changedFilesSinceSnapshot(), clearAppliedEntries(), collectApplyOwnedFiles(), collectRollbackFiles() (+42 more)

### Community 17 - "yorkIeUpsell.ts"
Cohesion: 0.08
Nodes (47): SidebarYorkReachOut(), CategoryDetailInsightsPanel(), clearAllYorkOfferDismissals(), clearYorkOfferDismiss(), DismissEntry, DismissMap, dismissYorkOffer(), filterDismissedYorkOffers() (+39 more)

### Community 18 - "detect-html.mjs"
Cohesion: 0.10
Nodes (38): detectUrl(), runVisualContrastFallback(), serializeDesignSystemForBrowser(), CSS_IN_JS_EXTENSIONS, detectText(), extFromFilePath(), extractCSSinJS(), extractStyleBlocks() (+30 more)

### Community 19 - "design-system.mjs"
Cohesion: 0.10
Nodes (47): addColorObject(), addDesignColor(), addRoundedScale(), addRoundedToken(), addSidecarColors(), addSidecarRadii(), addTypographyFonts(), canonicalDesignFindingKey() (+39 more)

### Community 20 - "impeccable-config.mjs"
Cohesion: 0.10
Nodes (47): applyDetectionConfigSource(), clampByte(), cleanIgnoreValueDisplay(), cloneDetectionConfig(), cloneRawDetectionConfig(), colorIgnoreKey(), DEFAULT_DETECTION_CONFIG, DETECTOR_CONFIG_KEYS (+39 more)

### Community 21 - "hook-lib.mjs"
Cohesion: 0.07
Nodes (45): ACK_EXTS, applyConfigSource(), applyDetectorConfigSource(), applyPatchText(), clampByte(), cloneDefaultConfig(), CO_SCAN_STYLE_NAMES, colorIgnoreKey() (+37 more)

### Community 22 - "el"
Cohesion: 0.09
Nodes (47): actionLabel(), applyConfigureBarChrome(), bindConfigureCountPillTooltip(), bindConfigureInlineControlHover(), bindConfigureModifierPillHover(), buildConfigureActionControl(), buildConfigureCountControl(), buildConfigureRow() (+39 more)

### Community 23 - "live-server.mjs"
Cohesion: 0.09
Nodes (43): assembleLiveBrowserScript(), assertLiveBrowserScriptParts(), LIVE_BROWSER_SCRIPT_PARTS, readLiveBrowserScriptParts(), resolveLiveBrowserScriptParts(), acknowledgePendingEvent(), activeSessionSummaries(), agentPollingConnected() (+35 more)

### Community 24 - "extract-import-map.mjs"
Cohesion: 0.11
Nodes (44): applyTsAlias(), buildResolutionContext(), buildSuffixIndex(), __dirname, dirOf(), extractExtraImportSources(), extractKotlinSources(), extractRequireSources() (+36 more)

### Community 25 - "OnboardingFlow.tsx"
Cohesion: 0.06
Nodes (37): Answers, BUSINESS_MODELS, COMPANY_CATALOG, CompanyRecord, CompanySearch(), ConnectStatus, dotColor(), dotGlow() (+29 more)

### Community 26 - "merge-batch-graphs.py"
Cohesion: 0.09
Nodes (42): _add_unique(), _basename(), classify_id_fix(), _ensure_tested_tag(), _file_node_path(), is_test_path(), _join(), _js_ts_sibling_candidates() (+34 more)

### Community 27 - "css-cascade.mjs"
Cohesion: 0.09
Nodes (32): applyStaticDeclaration(), buildBorderOverrideMap(), buildStaticStyleMap(), buildStaticWindow(), collectStaticCssRules(), collectStaticCssText(), compareStaticPriority(), cssPropToCamel() (+24 more)

### Community 28 - "detect-antipatterns-browser.js"
Cohesion: 0.08
Nodes (38): checkBorders(), checkClippedOverflow(), checkElementBorders(), checkElementBordersDOM(), checkElementClippedOverflow(), checkElementClippedOverflowDOM(), checkElementItalicSerif(), checkElementItalicSerifDOM() (+30 more)

### Community 29 - "manual-apply.mjs"
Cohesion: 0.10
Nodes (36): addOpToManualApplyChunk(), APPLY_EVENT_HARD_TIMEOUT_MS, APPLY_EVENT_SOFT_DEADLINE_MS, buildManualApplyAgentAction(), clearManualApplyTransaction(), collectManualApplyFiles(), compactManualApplyBatch(), compactManualApplyCandidates() (+28 more)

### Community 30 - "hook-admin.mjs"
Cohesion: 0.14
Nodes (39): ACTIONS, addIgnoreFile(), addIgnoreRule(), addIgnoreValue(), DETECTOR_CONFIG_KEYS, detectorSection(), fileHasImpeccableHookMarker(), HOOK_MANIFEST_TARGETS (+31 more)

### Community 31 - "hook-before-edit.mjs"
Cohesion: 0.11
Nodes (39): allow(), bumpCursorDenial(), cursorBlockMessage(), deny(), done(), escapeRegExp(), findingSignature(), firstMatch() (+31 more)

### Community 32 - "utils.ts"
Cohesion: 0.07
Nodes (25): AlertDialogAction(), AlertDialogCancel(), AlertDialogContent(), AlertDialogDescription(), AlertDialogFooter(), AlertDialogHeader(), AlertDialogOverlay(), AlertDialogTitle() (+17 more)

### Community 33 - "live-wrap.mjs"
Cohesion: 0.13
Nodes (35): argVal(), buildInsertWrapperLines(), computeInsertLine(), INSERT_POSITIONS, insertCli(), isInsertPosition(), resolveElementMatch(), buildSvelteComponentCssAuthoring() (+27 more)

### Community 34 - "svelte-component.mjs"
Cohesion: 0.10
Nodes (44): applyLegacyDeferredAcceptsOnStartup(), appendCssToSvelteStyle(), appendSanitizedCssRule(), applyDeferredSvelteComponentAccepts(), bakeParamValuesInCss(), buildInsertVariantStub(), buildPropContract(), buildPropsScript() (+36 more)

### Community 35 - "design-parser.mjs"
Cohesion: 0.15
Nodes (33): buildColor(), CANONICAL_SECTIONS, collectBullets(), collectColorValues(), collectParagraphs(), detectFormat(), extractColors(), extractComponents() (+25 more)

### Community 36 - "detect-antipatterns.mjs"
Cohesion: 0.14
Nodes (28): confirm(), detectCli(), formatFindings(), formatFindingSummary(), handleStdin(), printUsage(), loadDesignSystemForCwd(), parseFrontmatter() (+20 more)

### Community 37 - "live-accept.mjs"
Cohesion: 0.14
Nodes (32): acceptCli(), argVal(), buildCarbonizeReplacement(), decodeHtmlAttr(), deindentContent(), detectCommentSyntax(), escapeRegExp(), expandReplaceRange() (+24 more)

### Community 38 - "live-copy-edit-agent.mjs"
Cohesion: 0.14
Nodes (31): applyMockWrites(), buildCopyEditBatchPrompt(), checkFrameworkSourceSyntax(), chooseCopyEditAgent(), COMMAND_AUTH_CACHE, commandAuthed(), commandExists(), compactBatchForPrompt() (+23 more)

### Community 39 - "PatriotPayJourneyInner"
Cohesion: 0.08
Nodes (30): investorCompanyToSelected(), attachIntelligenceToDocumentSlot(), BENCHMARK_METRIC_FORM_KEYS, canAccessPersonalOverview(), createBenchmarkIntelligence(), createDocumentIntelligence(), createFormFieldIntelligenceSource(), createInitialBenchmarkSeed() (+22 more)

### Community 40 - "investorData.ts"
Cohesion: 0.08
Nodes (27): buildDotsForMetric(), colorForBenchmarkScore(), DEMOGRAPHIC_COLORS, DemographicAllocationSlice, INVESTOR_PIPELINE, INVESTOR_WATCHLISTS, PIPELINE_STAGES, PipelineBoard (+19 more)

### Community 41 - "dependencies"
Cohesion: 0.07
Nodes (27): canvas-confetti, @emotion/styled, @mui/icons-material, @mui/material, dependencies, canvas-confetti, @emotion/styled, @mui/icons-material (+19 more)

### Community 42 - "live-manual-edit-evidence.mjs"
Cohesion: 0.16
Nodes (26): analyzeSourceHint(), buildCandidatesForOp(), buildContextHintsByRef(), buildManualEditEvidence(), collectSearchFiles(), countOps(), decodeBasicHtml(), escapeRegExp() (+18 more)

### Community 43 - "AskFuelChat.tsx"
Cohesion: 0.11
Nodes (21): AskFuelChatDrawer(), ChatMsg, FLAG_COLOUR, FLAG_DOT, mid(), playbookResponse(), Brief, BriefBullet (+13 more)

### Community 44 - "OnboardingWizard"
Cohesion: 0.14
Nodes (27): BENCHMARK_GROUPS, BENCHMARK_WIZARD_FIELDS, BenchmarkCard(), buildDevSectionSummary(), buildGtmSectionSummary(), buildHolisticSectionSummary(), buildQualSignals(), buildRevopsSectionSummary() (+19 more)

### Community 45 - "intelligenceFilters.ts"
Cohesion: 0.12
Nodes (26): buildYearOptions(), currentQuarter(), endOfDay(), filterIntelligenceByDate(), getIntelligenceDateRange(), groupIntelligenceItems(), INTELLIGENCE_DATE_PRESETS, IntelligenceCustomRange (+18 more)

### Community 46 - "documentRefForElement"
Cohesion: 0.08
Nodes (30): addManualContextText(), canRestoreManualEditElement(), collectManualContextPieces(), contextElementForManualEdit(), copyEditContainerContext(), copyEditLeafContext(), cssIdent(), directMixedTextRestoreNodes() (+22 more)

### Community 47 - "live-poll.mjs"
Cohesion: 0.18
Nodes (24): completionAckForAcceptResult(), completionTypeForAcceptResult(), augmentEventWithAcceptHandling(), buildAcceptScriptArgs(), buildPollReplyPayload(), EVENT_TYPES_NEEDING_AGENT_REPLY, fetchNextEvent(), fetchServerStatus() (+16 more)

### Community 48 - "InvestorDashboard.tsx"
Cohesion: 0.09
Nodes (16): donutSlicePath(), HomeThesisMatchRow(), InvestorDashboardSection, polarToCartesian(), SectorAllocationChart(), WatchlistsPage(), formatSuggestionScore(), INVESTOR_PORTFOLIO_LISTS (+8 more)

### Community 49 - "enrichCategoryData"
Cohesion: 0.11
Nodes (25): buildBenchmarkContributors(), buildCategoryBenchmarkInputs(), buildCategoryGlanceSummary(), buildCategoryScoreContributors(), buildDetailContributors(), buildDetailFieldRows(), buildDetailSnippets(), buildGlanceAnswersCta() (+17 more)

### Community 50 - "trackQuestions.ts"
Cohesion: 0.13
Nodes (22): DetailsDrawer(), countApplicableQuestions(), countDetailAnswers(), countSectionAnswers(), DETAIL_QUESTION_BY_ID, DETAIL_QUESTION_LABEL, DETAIL_SECTIONS, DetailAnswers (+14 more)

### Community 51 - "initGlobalBar"
Cohesion: 0.14
Nodes (24): barPaletteForTheme(), brandMarkSvg(), buildParamsPanel(), detectPageTheme(), ensureAgentPollTooltip(), fetchAgentPollingStatus(), formatRangeValue(), hideAgentPollTooltip() (+16 more)

### Community 52 - "handleManualEditActivity"
Cohesion: 0.19
Nodes (24): clearStoredManualApplyState(), fetchPendingCount(), handleManualEditActivity(), hidePendingApplyDock(), manualApplyLoadingText(), manualApplyStateKey(), manualEditEventForCurrentPage(), numberOrNull() (+16 more)

### Community 53 - "insert-ui.mjs"
Cohesion: 0.11
Nodes (10): canCreateInsert(), clampPlaceholderSize(), computeInsertPosition(), groupSiblingRows(), hitSiblingInsertGap(), horizontalOverlap(), insertCreateDisabledReason(), insertLineCoords() (+2 more)

### Community 54 - "analyzeVisualContrastCandidate"
Cohesion: 0.19
Nodes (14): addBrowserFindings(), addVisualContrastFindings(), addVisualContrastResult(), analyzeVisualContrast(), analyzeVisualContrastCandidate(), clearOverlays(), detachOverlay(), disconnectLazyVisualContrastObserver() (+6 more)

### Community 55 - "manual-edit-routes.mjs"
Cohesion: 0.19
Nodes (19): args, cwd, pageUrlFilter, remaining, compactManualLogText(), summarizeManualApplyFailures(), summarizeManualDiagnostics(), summarizeManualLogFile() (+11 more)

### Community 56 - "ScorecardV2"
Cohesion: 0.11
Nodes (23): mapOnboardingToDetailAnswers(), buildAdvisorRecommendedActions(), estimateRunwayMonths(), getCurrentQuarterLabel(), getMetricMap(), isPrivateWorkspaceOverviewReady(), isQuarterStale(), loadDetailAnswers() (+15 more)

### Community 57 - "context.mjs"
Cohesion: 0.16
Nodes (20): buildMissingTargetDirective(), buildResolvedContextDirective(), buildTargetSelectionDirective(), buildUpdateDirective(), cli(), compareSemver(), computeUpdateDirective(), DESIGN_NAMES (+12 more)

### Community 58 - "parseRgb"
Cohesion: 0.16
Nodes (26): checkColors(), checkElementAIPaletteDOM(), checkElementColors(), checkElementColorsDOM(), checkElementGlow(), checkElementGlowDOM(), checkElementIconTile(), checkElementIconTileDOM() (+18 more)

### Community 59 - "buildTrackInsightLists"
Cohesion: 0.14
Nodes (22): buildCategoryFocusNarrative(), buildGlanceNeedsWorkLine(), buildGlanceStrengthLine(), buildTrackInsightLists(), classifyUserIntel(), DetailInsightChipStrip(), formatInitiativeReason(), founderPlainCopy() (+14 more)

### Community 60 - "runHook"
Cohesion: 0.15
Nodes (21): bumpEditCount(), clampGroupedToBudget(), clampToBudget(), dedupeAgainstCache(), depthIsSet(), directiveFooter(), ensureFile(), ensureSession() (+13 more)

### Community 61 - "onAnnotDown"
Cohesion: 0.15
Nodes (21): applyPlaceholderDimensions(), beginEditPin(), buildAnnotationsForCapture(), buildPinElement(), cancelEditingPin(), clampPlaceholderSize(), finalizeEditingPin(), initAnnotOverlay() (+13 more)

### Community 62 - "scan-project.mjs"
Cohesion: 0.16
Nodes (19): buildDefaultsOnlyFilter(), CATEGORY_BY_EXT, countLines(), detectCategory(), detectLanguage(), __dirname, dotfileKey(), enumerateFiles() (+11 more)

### Community 63 - "command.tsx"
Cohesion: 0.12
Nodes (14): Command(), CommandGroup(), CommandInput(), CommandItem(), CommandList(), CommandSeparator(), CommandShortcut(), Dialog() (+6 more)

### Community 64 - "readLiveServerInfo"
Cohesion: 0.21
Nodes (17): isLiveServerPidReachable(), readLiveServerInfo(), completeCli(), completeThroughServer(), parseArgs(), readServerInfo(), collectManualApplyFiles(), manualApplyReplyCommand() (+9 more)

### Community 65 - "impeccable-paths.mjs"
Cohesion: 0.22
Nodes (18): resolveProjectRoot(), firstExisting(), getDesignSidecarCandidates(), getDesignSidecarPath(), getImpeccableDir(), getLegacyLiveAnnotationsDir(), getLegacyLiveConfigPath(), getLegacyLiveServerPath() (+10 more)

### Community 66 - "getBenchmarkTierStyle"
Cohesion: 0.14
Nodes (19): BenchmarkCohortTrack(), BenchmarkPeerComparisonPanel(), BenchmarkPercentileExplanation(), BenchmarkPercentileInline(), BenchmarkPercentileScale(), buildBenchmarkResultRows(), estimateValuePercentile(), getBenchmarkPercentileValue() (+11 more)

### Community 67 - "InitiativeDetailDrawer"
Cohesion: 0.18
Nodes (19): buildDefaultMilestones(), buildDefaultRecommendedInitiatives(), createInitiativeRecord(), defaultInitiativeTopic(), emptyInitiativeDraft(), INITIATIVE_ADVISOR_DIRECTORY, InitiativeDetailDrawer(), initiativeKindLabel() (+11 more)

### Community 68 - "launchpad-cloud-deploy-run.util.mjs"
Cohesion: 0.20
Nodes (17): directoryHasTerraformFiles(), findCloudFormationTemplate(), formatExportLines(), formatExportScript(), FRONTEND_LAYER_CANDIDATES, isSecretKey(), missingCfnOutputKeys(), readTerraformBundle() (+9 more)

### Community 69 - "collectBrowserFindings"
Cohesion: 0.13
Nodes (18): browserColorsClose(), browserDesignSystemConfig(), browserFindingsFromMap(), browserHasDirectText(), browserPrimaryFont(), browserRadiusTokens(), browserSampleText(), checkBrowserDesignSystemSources() (+10 more)

### Community 70 - "resolveLengthPx"
Cohesion: 0.12
Nodes (18): checkElementHeroEyebrow(), checkElementHeroEyebrowDOM(), checkElementOversizedH1(), checkElementOversizedH1DOM(), checkElementQuality(), checkHeroEyebrow(), checkOversizedH1(), checkRepeatedSectionKickers() (+10 more)

### Community 71 - "GENERIC_FONTS"
Cohesion: 0.16
Nodes (17): checkPageTypography(), checkStaticPageTypography(), checkBorders(), checkElementBorders(), checkElementBordersDOM(), checkPageTypography(), checkTypography(), resolveSerif() (+9 more)

### Community 72 - "FuelOnboardingChat"
Cohesion: 0.12
Nodes (18): buildFuelHelpContent(), buildFuelWorkspacePreviewContent(), BUSINESS_MODEL_OPTIONS, checkIsYorkClient(), CrunchbaseCard(), defaultTeamDistribution(), domainFromEmail(), FuelOnboardingChat() (+10 more)

### Community 73 - "parseAnyColor"
Cohesion: 0.15
Nodes (17): checkCreamPalette(), checkElementQualityDOM(), checkQuality(), colorsNearlyMatch(), creamFromClassList(), cssColorAlpha(), cssColorIsTransparent(), getComputedStyleFor() (+9 more)

### Community 74 - "menubar.tsx"
Cohesion: 0.12
Nodes (11): Menubar(), MenubarCheckboxItem(), MenubarContent(), MenubarItem(), MenubarLabel(), MenubarRadioItem(), MenubarSeparator(), MenubarShortcut() (+3 more)

### Community 75 - "resolveContext"
Cohesion: 0.14
Nodes (16): contextSourcePath(), contextSourceStatus(), findMonorepoRoot(), firstExisting(), hasGitBoundary(), isCandidateProjectRoot(), isPathInside(), isPathInsideOrEqual() (+8 more)

### Community 76 - "sampleCssBackground"
Cohesion: 0.18
Nodes (16): blendRgba(), clampByte(), firstCssUrl(), getLayerValue(), loadVisualContrastImage(), parseObjectPosition(), parsePositionPair(), parsePositionToken() (+8 more)

### Community 77 - "refreshParamsPanel"
Cohesion: 0.20
Nodes (16): applyParamDefaults(), applyParamValue(), buildCyclingRow(), closedClipPath(), cycleVariant(), getVisibleVariantEl(), hideParamsPanel(), navBtn() (+8 more)

### Community 78 - "package.json"
Cohesion: 0.12
Nodes (15): name, vite, peerDependenciesMeta, react, react-dom, pnpm, overrides, private (+7 more)

### Community 79 - "dropdown-menu.tsx"
Cohesion: 0.12
Nodes (9): DropdownMenuCheckboxItem(), DropdownMenuContent(), DropdownMenuItem(), DropdownMenuLabel(), DropdownMenuRadioItem(), DropdownMenuSeparator(), DropdownMenuShortcut(), DropdownMenuSubContent() (+1 more)

### Community 80 - "buildCategoryData"
Cohesion: 0.24
Nodes (15): buildBenchmarkChips(), buildCategoryData(), buildCategoryInitiatives(), CategoryDrilldownView(), COLOUR_ABOVE(), COLOUR_AROUND(), COLOUR_BELOW(), COLOUR_STRONG() (+7 more)

### Community 81 - "context-signals.mjs"
Cohesion: 0.25
Nodes (12): extractRegister(), cli(), COMMON_DEV_PORTS, devServerSignals(), gatherSignals(), gitSignals(), hasCode(), latestCritique() (+4 more)

### Community 83 - "event-validation.mjs"
Cohesion: 0.26
Nodes (12): FORBIDDEN_MANUAL_EDIT_TEXT_CHARS, INSERT_POSITIONS, isValidId(), isValidVariantId(), validateAnnotationFields(), validateEvent(), validateInsertGenerate(), validateManualEditEvent() (+4 more)

### Community 84 - "carousel.tsx"
Cohesion: 0.20
Nodes (13): Carousel(), CarouselApi, CarouselContent(), CarouselContext, CarouselContextProps, CarouselItem(), CarouselNext(), CarouselOptions (+5 more)

### Community 85 - "form.tsx"
Cohesion: 0.20
Nodes (11): FormControl(), FormDescription(), FormFieldContext, FormFieldContextValue, FormItem(), FormItemContext, FormItemContextValue, FormLabel() (+3 more)

### Community 86 - "critique-storage.mjs"
Cohesion: 0.32
Nodes (11): kebab(), listSnapshotsForSlug(), main(), nowFilenameStamp(), parseFrontmatter(), readLatestSnapshot(), readTrend(), serializeFrontmatter() (+3 more)

### Community 87 - "popover.tsx"
Cohesion: 0.13
Nodes (4): HoverCardContent(), PopoverContent(), ResizableHandle(), ResizablePanelGroup()

### Community 88 - "formatUsdCompact"
Cohesion: 0.17
Nodes (13): DemographicAllocationChart(), DemographicAmountLabel(), DemographicTooltip(), greetingForHour(), HomeDashboard(), PortfolioCompanyRow(), buildDemographicAllocation(), buildSectorAllocation() (+5 more)

### Community 89 - "live.mjs"
Cohesion: 0.32
Nodes (11): loadContext(), resolveTargetSelection(), safeRead(), __dirname, ensureServerRunning(), globToRegex(), liveCli(), missingLiveContext() (+3 more)

### Community 90 - "ui-core.mjs"
Cohesion: 0.23
Nodes (10): createLiveBrowserDomHelpers(), activeElementDeep(), appendStyleToLiveUiRoot(), appendToLiveUiRoot(), escapeCssIdent(), getLiveUiElementById(), LIVE_CHROME_MOUNT_CONTRACT, LIVE_UI_COMPONENT_IDS (+2 more)

### Community 91 - "session-store.mjs"
Cohesion: 0.27
Nodes (9): applyEvent(), baseSnapshot(), COMPLETED_PHASES, getJournalPath(), getSnapshotPath(), rebuildSnapshotFromJournal(), safeSessionId(), toPendingEvent() (+1 more)

### Community 92 - "compute-batches.mjs"
Cohesion: 0.26
Nodes (10): buildBatchOfMap(), buildNonCodeBatches(), countBasedAssignment(), extractExports(), __filename, main(), mergeSmallBatches(), PLUGIN_ROOT (+2 more)

### Community 93 - "discoverTargetCandidates"
Cohesion: 0.25
Nodes (11): directChildDirs(), discoverRootsForPattern(), discoverTargetCandidates(), expandSimplePattern(), findTargetExample(), hasFallbackWorkspaceChildren(), isIgnoredWorkspaceDiscoveryDir(), isMonorepoRoot() (+3 more)

### Community 94 - "palette.mjs"
Cohesion: 0.24
Nodes (7): args, buildWeights(), hashUnit(), pickSeed(), seed, SEEDS, weightedPick()

### Community 95 - "pin.mjs"
Cohesion: 0.25
Nodes (9): __dirname, findHarnessDirs(), generatePinnedSkill(), HARNESS_DIRS, loadCommandMetadata(), pin(), root, unpin() (+1 more)

### Community 96 - "chart.tsx"
Cohesion: 0.25
Nodes (9): ChartConfig, ChartContainer(), ChartContext, ChartContextProps, ChartLegendContent(), ChartTooltipContent(), getPayloadConfigFromPayload(), THEMES (+1 more)

### Community 97 - "select.tsx"
Cohesion: 0.18
Nodes (7): SelectContent(), SelectItem(), SelectLabel(), SelectScrollDownButton(), SelectScrollUpButton(), SelectSeparator(), SelectTrigger()

### Community 98 - "IntegrationSetupPage.tsx"
Cohesion: 0.20
Nodes (9): ApiField, CATEGORIES, ConnectionMethod, Integration, INTEGRATIONS, IntegrationSetupPage(), Status, View (+1 more)

### Community 99 - "investGeography.ts"
Cohesion: 0.29
Nodes (10): dealMatchesInvestGeography(), INVEST_GEOGRAPHY_OPTIONS, investGeographyDisplayLabel(), normalizeInvestGeography(), normalizeInvestGeographyLabel(), normalizeInvestGeographySelection(), DEAL_SUGGESTIONS, dealMatchesGeography() (+2 more)

### Community 100 - "buildMetricGroups"
Cohesion: 0.29
Nodes (11): BenchmarkMotion(), buildInsightStack(), buildMetricGroups(), buildMetricInsights(), formatMetricDisplay(), formatUsd(), fuelActionLine(), MetricDef (+3 more)

### Community 101 - "OverviewFullSummaryPage"
Cohesion: 0.20
Nodes (11): buildInvestorFocusAreas(), buildInvestorSnapshotRows(), buildInvestorStandCopy(), EFFICIENCY_EXTRA_COHORTS, formatInitiativeDueLabel(), initiativeDueMeta(), initiativeStatusMeta(), OverviewFullSummaryPage() (+3 more)

### Community 102 - "resolveWorkspaceProjectRoot"
Cohesion: 0.29
Nodes (10): escapeRegExp(), isExcludedByWorkspacePattern(), MONOREPO_FALLBACK_PROJECT_DIRS, nearestProjectLikeRoot(), normalizeWorkspacePattern(), projectRootFromDoubleStarPattern(), projectRootFromWorkspacePattern(), resolveWorkspaceProjectRoot() (+2 more)

### Community 103 - "inline-ignores.mjs"
Cohesion: 0.40
Nodes (9): addRules(), applyInlineIgnores(), getSet(), hasDirectives(), isInlineIgnored(), normalizeRule(), parseInlineIgnores(), parseRuleList() (+1 more)

### Community 104 - "normalizeIgnoreValueEntries"
Cohesion: 0.36
Nodes (10): cleanIgnoreValueDisplay(), extractFindingIgnoreValue(), extractFindingIgnoreValueRaw(), extractMotionIgnoreValue(), filterFindings(), formatFindingIgnoreCommand(), isIgnoredFindingValue(), normalizeIgnoreRule() (+2 more)

### Community 105 - "syncEditBadgeHitProxies"
Cohesion: 0.27
Nodes (10): bindEditBadgeProxy(), editBadgeProxyTargets(), initEditBadge(), initEditBadgeHitProxies(), positionEditBadge(), proxyMouseEvent(), setImportantStyle(), styleEditBadgeProxy() (+2 more)

### Community 106 - "load_graph"
Cohesion: 0.33
Nodes (9): load_graph(), main(), merge_graphs(), _num(), Any, Path, Coerce a value to float for safe comparison (handles string weights)., Load and minimally validate a knowledge graph JSON file. (+1 more)

### Community 107 - "navigation-menu.tsx"
Cohesion: 0.22
Nodes (9): NavigationMenu(), NavigationMenuContent(), NavigationMenuIndicator(), NavigationMenuItem(), NavigationMenuLink(), NavigationMenuList(), NavigationMenuTrigger(), navigationMenuTriggerStyle (+1 more)

### Community 108 - "formatBenchmarkDisplay"
Cohesion: 0.31
Nodes (10): analyzeBenchmarkSnapshot(), buildCompositeBenchmarkInsight(), buildKpiSnapshotMoment(), fmtShort(), formatBenchmarkDisplay(), isStrongTier(), isWeakTier(), metricRef() (+2 more)

### Community 109 - "serializeFindings"
Cohesion: 0.25
Nodes (9): buildSelectorSegment(), generateSelector(), isElementHidden(), isLikelyHashedClass(), postSerializedFindings(), renderBrowserFindings(), scanResultMeta(), serializeFindings() (+1 more)

### Community 110 - "devDependencies"
Cohesion: 0.22
Nodes (9): devDependencies, tailwindcss, @tailwindcss/vite, vite, @vitejs/plugin-react, tailwindcss, @tailwindcss/vite, vite (+1 more)

### Community 111 - "App.tsx"
Cohesion: 0.28
Nodes (7): App(), View, answersToOnboardingBenchmark(), INVESTOR_MODELS, isInvestorPersona(), OnboardingFlowAnswers, OnboardingBenchmarkInput

### Community 112 - "DealPipelineSection"
Cohesion: 0.25
Nodes (9): DealPipelineSection(), HomePipelinePulse(), openPipelineDeal(), resolvePipelineCompany(), INVESTOR_PORTFOLIO, PIPELINE_BOARDS, stageDealTotal(), SUGGESTED_FOUNDERS (+1 more)

### Community 113 - "buildOverviewWikiSummary"
Cohesion: 0.28
Nodes (9): buildAdvisorGenericSummary(), buildAdvisorSummary(), buildFocusIntelTags(), buildOverviewWikiSummary(), categoryUrgency(), computeOverallContextPct(), isWeakTier(), wikiCite() (+1 more)

### Community 114 - "launchpad-cloud-deploy-run.sh"
Cohesion: 0.43
Nodes (5): log_command(), run_with_exports(), launchpad-cloud-deploy-run.sh script, step(), sync_repo_before_deploy()

### Community 115 - "readWorkspacePatterns"
Cohesion: 0.32
Nodes (8): parseYamlFlowList(), readJson(), readLernaWorkspaces(), readPackageWorkspaces(), readPnpmWorkspaces(), readWorkspacePatterns(), stripYamlInlineComment(), unquoteYamlValue()

### Community 116 - "expandScanTargets"
Cohesion: 0.36
Nodes (8): coLocatedStylesheets(), expandScanTargets(), hasPathTraversal(), isInsideProject(), normalizeScanTargets(), parseStaticStyleImports(), STYLE_EXTS, UI_CODE_EXTS

### Community 117 - "buildPortfolioCompanyView"
Cohesion: 0.29
Nodes (8): InvestorDashboard(), readHubspotConnected(), buildInvestorFundSummary(), buildPortfolioCompanyView(), buildPortfolioFundTotals(), getPortfolioRedFlags(), movementFromArrGrowth(), rankPortfolioCompanies()

### Community 118 - "dismissRecActionsTip"
Cohesion: 0.29
Nodes (8): clearRecActionsTipPending(), dismissRecActionsTip(), isRecActionsTipDismissed(), isRecActionsTipPending(), markRecActionsTipPending(), recActionsTipPendingKey(), recActionsTipStorageKey(), resetRecActionsTipForOnboarding()

### Community 119 - "checkElementGptBorderShadowDOM"
Cohesion: 0.38
Nodes (7): borderColorsFromStyle(), borderWidthsFromStyle(), checkElementGptBorderShadow(), checkElementGptBorderShadowDOM(), checkGptThinBorderWideShadow(), shadowLayerAlpha(), shadowMaxBlurPx()

### Community 120 - "live-target.mjs"
Cohesion: 0.43
Nodes (4): parseTargetOptions(), parseTargetPath(), TargetArgError, resolveLiveTarget()

### Community 122 - "extract-structure.mjs"
Cohesion: 0.33
Nodes (5): buildResult(), __dirname, main(), pluginRoot, require

### Community 123 - "toggle-group.tsx"
Cohesion: 0.43
Nodes (5): ToggleGroup(), ToggleGroupContext, ToggleGroupItem(), Toggle(), toggleVariants

### Community 124 - "signalCatalog.ts"
Cohesion: 0.29
Nodes (5): SIGNAL_CATALOG, SIGNAL_CATALOG_BY_KEY, SIGNAL_CATEGORY_KEYS, SignalCategory, SignalDef

### Community 125 - "figma"
Cohesion: 0.33
Nodes (5): figma, figma-remote, FIGMA_API_KEY, npx, figma-developer-mcp

### Community 126 - "checkElementTextOverflowDOM"
Cohesion: 0.28
Nodes (9): checkElementTextOverflowDOM(), classSelector(), clippedByInset(), clippedByRect(), expandBoxShorthand(), firstMetricLengthPx(), isRenderedForBrowserRule(), isScreenReaderOnlyTextStyle() (+1 more)

### Community 127 - "countActiveDocuments"
Cohesion: 0.33
Nodes (6): countActiveDocuments(), DataRoomPage(), DocumentUploadDropdown(), getActiveDocumentSlots(), getPendingSources(), slugifyDocumentLabel()

### Community 128 - "IntelligenceLogForm"
Cohesion: 0.47
Nodes (6): currentIntelligencePeriod(), formatIntelligencePeriod(), IntelligenceLogForm(), intelligencePeriodYearOptions(), normalizeIntelligencePeriod(), parseIntelligencePeriod()

### Community 129 - "isGeneratedFile"
Cohesion: 0.70
Nodes (4): hasGeneratedHeader(), HEADER_MARKERS, isGeneratedFile(), isGitIgnored()

### Community 130 - "build-fingerprints.mjs"
Cohesion: 0.40
Nodes (3): __dirname, pluginRoot, require

### Community 131 - "user-story-template.py"
Cohesion: 0.60
Nodes (4): main(), normalize(), parse_args(), Namespace

### Community 132 - "peerDependencies"
Cohesion: 0.40
Nodes (5): peerDependencies, react, react-dom, react, react-dom

### Community 133 - "alert.tsx"
Cohesion: 0.50
Nodes (4): Alert(), AlertDescription(), AlertTitle(), alertVariants

### Community 134 - "input-otp.tsx"
Cohesion: 0.40
Nodes (3): InputOTP(), InputOTPGroup(), InputOTPSlot()

### Community 135 - "evaluateSourceIntelligenceGeneration"
Cohesion: 0.40
Nodes (5): ContextFeedPage(), createSourceIntelligence(), evaluateSourceIntelligenceGeneration(), inferIntelligenceTypeFromDocument(), inferMainCategoryFromSource()

### Community 136 - "InitiativeDueQuarterField"
Cohesion: 0.40
Nodes (5): displayInitiativeDue(), formatInitiativeDue(), InitiativeDueQuarterField(), initiativeDueYearOptions(), parseInitiativeDue()

### Community 137 - "InitiativeMilestoneRow"
Cohesion: 0.60
Nodes (5): InitiativeMilestoneRow(), isoToDisplayDate(), isValidMilestoneIsoDate(), milestoneDueFromDateInput(), toMilestoneDateInputValue()

### Community 138 - "detect.mjs"
Cohesion: 0.50
Nodes (3): candidates, detectorPath, __dirname

### Community 139 - "writeAuditLog"
Cohesion: 0.83
Nodes (3): writeAuditLog(), main(), readStdin()

### Community 141 - "renderBoldText"
Cohesion: 0.50
Nodes (4): FuelHelpBubble(), InsightBulletList(), KpiSnapshotMoment, renderBoldText()

### Community 143 - "PortfoliosPage"
Cohesion: 1.00
Nodes (3): PortfoliosPage(), buildPortfolioBenchmarkSummary(), companiesForPortfolioList()

## Knowledge Gaps
- **471 isolated node(s):** `npx`, `figma-developer-mcp`, `FIGMA_API_KEY`, `figma-remote`, `FRONTEND_LAYER_CANDIDATES` (+466 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **45 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `v()` connect `modern-screenshot.umd.js` to `live-browser.js`, `design-parser.mjs`, `resolveLengthPx`, `PatriotPayJourneyInner`, `FuelOnboardingChat`, `OnboardingWizard`, `context-signals.mjs`, `initGlobalBar`, `OnboardingFlow.tsx`, `css-cascade.mjs`?**
  _High betweenness centrality (0.223) - this node is a cross-community bridge._
- **Why does `el()` connect `el` to `live-browser.js`, `checks.mjs`, `collectBrowserFindings`, `resolveLengthPx`, `index.mjs`, `GENERIC_FONTS`, `parseAnyColor`, `setLiveState`, `FuelOnboardingChat`, `serializeFindings`, `refreshParamsPanel`, `initPageChat`, `detect-html.mjs`, `design-system.mjs`, `initGlobalBar`, `parseRgb`, `css-cascade.mjs`, `detect-antipatterns-browser.js`?**
  _High betweenness centrality (0.157) - this node is a cross-community bridge._
- **Why does `handleKeyDown()` connect `setLiveState` to `live-browser.js`, `resumeSession`, `refreshParamsPanel`, `sidebar.tsx`, `initGlobalBar`, `el`?**
  _High betweenness centrality (0.120) - this node is a cross-community bridge._
- **Are the 30 inferred relationships involving `el()` (e.g. with `browserFindingsFromMap()` and `collectVisualContrastCandidates()`) actually correct?**
  _`el()` has 30 INFERRED edges - model-reasoned connections that need verification._
- **What connects `npx`, `figma-developer-mcp`, `FIGMA_API_KEY` to the rest of the system?**
  _471 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `live-browser.js` be split into smaller, more focused modules?**
  _Cohesion score 0.030592528982395877 - nodes in this community are weakly interconnected._
- **Should `FuelOnboardingChat.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.017541229385307347 - nodes in this community are weakly interconnected._