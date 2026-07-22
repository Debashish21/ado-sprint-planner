/// <reference types="@raycast/api">

/* 🚧 🚧 🚧
 * This file is auto-generated from the extension's manifest.
 * Do not modify manually. Instead, update the `package.json` file.
 * 🚧 🚧 🚧 */

/* eslint-disable @typescript-eslint/ban-types */

type ExtensionPreferences = {
  /** Personal Access Token - ADO PAT. Needs Work Items (Read) — and (Read & Write) if you want the optional push-to-ADO action. */
  "pat": string,
  /** Organization - Your ADO org name, e.g. 'contoso' for dev.azure.com/contoso */
  "organization": string,
  /** Project - ADO project name */
  "project": string,
  /** Team - Primary team whose current iteration defines your sprint. Required for Plan Sprint; if set, also included in My Sprint's fetch. */
  "team"?: string,
  /** Additional Teams - Comma-separated extra team names. My Sprint pulls each team's current-iteration items and shows them segregated by team. Leave blank to only use Team above. */
  "teams"?: string,
  /** Done State - The state your process uses for completed items (Agile: Closed, Scrum: Done, Basic: Done) */
  "doneState": string,
  /** Extra Open States - Comma-separated states to keep visible even if ADO categorizes them as terminal — e.g. 'Failed' (failed work that needs rework, distinct from closed). */
  "extraOpenStates": string,
  /** Daily Capacity - How many items to schedule per working day when generating the plan */
  "dailyCapacity": string,
  /** Include Backlog - When on, the planner also pulls your open assigned tickets outside the current sprint (behind sprint items) so they get worked and closed. */
  "includeBacklog": boolean,
  /** Planner Mode - Deterministic sequences by priority locally. Auto (AI) uses Gemini to sequence smarter — requires an API key below. */
  "planMode": "deterministic" | "auto",
  /** Gemini API Key - Optional. Enables Auto (AI) sequencing via the Gemini free tier. Note: work-item titles are sent to Google when you re-plan with AI. */
  "geminiApiKey"?: string
}

/** Preferences accessible in all the extension's commands */
declare type Preferences = ExtensionPreferences

declare namespace Preferences {
  /** Preferences accessible in the `my-sprint` command */
  export type MySprint = ExtensionPreferences & {}
  /** Preferences accessible in the `my-tickets` command */
  export type MyTickets = ExtensionPreferences & {}
  /** Preferences accessible in the `today` command */
  export type Today = ExtensionPreferences & {}
  /** Preferences accessible in the `plan-sprint` command */
  export type PlanSprint = ExtensionPreferences & {}
  /** Preferences accessible in the `sprint-menubar` command */
  export type SprintMenubar = ExtensionPreferences & {}
}

declare namespace Arguments {
  /** Arguments passed to the `my-sprint` command */
  export type MySprint = {}
  /** Arguments passed to the `my-tickets` command */
  export type MyTickets = {}
  /** Arguments passed to the `today` command */
  export type Today = {}
  /** Arguments passed to the `plan-sprint` command */
  export type PlanSprint = {}
  /** Arguments passed to the `sprint-menubar` command */
  export type SprintMenubar = {}
}

