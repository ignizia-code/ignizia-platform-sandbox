````plaintext
Software Design Description (SDD): Leadership Governance and AI Policy Layer

## 1. Overview

This feature adds a Governance Layer to an existing Workflow Builder platform. It enables company leaders to define AI Policies that act as guardrails for employees. The primary goal of this MVP is to enable **Safe AI for Sensitive Work** by providing clear rules, data protection, and mandatory review controls where required.

## 2. System Objectives

Clarity and Accountability: Make AI usage rules explicit and visible to all team members.

Data Protection: Prevent sensitive data such as PII and financial information from leaving the organization through unapproved external providers.

Governance Visibility: Provide leaders with a dashboard to monitor AI usage and policy compliance.

Controlled Autonomy: Ensure review and approval for defined high impact categories such as Legal and Customer Facing workflows.

## 3. Detailed User Journey

### Phase 1: The Leader’s Configuration, Guardrail Setup

Persona: Sarah, Head of Ops

Goal: Define the safety boundaries for the Logistics Team.

1. Entry Point: Sarah logs in with a leadership role and selects the transformation path titled **Strategy: Safe AI for Sensitive Work**.

2. The Policy Interview: A conversational agent interviews Sarah to build the policy.

   • “To enable safe AI for sensitive work, let’s define clear rules for the Logistics Team.”

   • Data Posture: Sarah chooses Tight control.

   • External Providers: Sarah toggles No to sending data to third party AI providers.

   • Tool Registry: Sarah selects Excel, Outlook, and SAP as Approved Tools.

   • Review Required Categories: Sarah flags Customer Facing and Finance as requiring her review before activation.

3. Policy Activation: The system generates a JSON policy schema and applies it to the Logistics Team scope. Sarah sees a Policy Active badge.

Policies can be applied to one team or to the entire organization, depending on the leader’s scope and role.

### Phase 2: The Employee’s Workflow Building, Real Time Guidance

Persona: Mark, Employee

Goal: Automate an Invoice Processing workflow.

1. Contextual Awareness: Mark describes a step: “Extract totals from the invoice and email the client.”

2. Deterministic Tagging: The system detects the keyword Invoice. It prompts Mark: “I detected ‘Invoice’ and tagged this step as Sensitive and Finance.” A policy icon appears showing that Sensitive data has restricted AI options.

3. Filtered Optimization: Mark clicks Optimize with AI.

   • The AI agent checks the Policy Layer before suggesting integrations.

   • Because the data is Sensitive and the policy is Tight, the agent proposes: “This step contains sensitive finance data. External providers are blocked by company policy. I will use an internal script to summarize this instead.”

4. Submission: Since the workflow is Customer Facing, the Publish button changes to Submit for Leader Review.

### Phase 3: The Leader’s Dashboard, Visibility and Control

Persona: Sarah, Leader

1. Approval Queue: Sarah sees Mark’s workflow. She reviews the AI generated email draft and the internal script logic. She clicks Approve and Activate.

2. Audit Trail: Sarah views a log showing that an external provider attempt was blocked and redirected to a safe internal alternative, confirming policy enforcement.

3. Compliance Health: She sees a chart showing how many workflows are Policy Compliant, giving her confidence to report AI progress to the board.

## 4. Feature Set Specifications

### 4.1 Policy Configuration Wizard

• Conversational Logic: A 5 to 7 question flow mapping user intent to specific variables: Data_Control, Allowed_Tools, External_AI_Allowed, Review_Categories, and Autonomy_Level.

• Scope Management: For MVP, policies are mapped to a TeamID.

• Policy Output: A structured data object that serves as a permanent constraint for the Workflow Agent.

### 4.2 Data Sensitivity Classifier

• Keyword Engine: A list of sensitive triggers such as Payroll, Contract, Social Security, Invoice, PII, Secret.

• Three Tier Tagging:

1. Public: No restrictions.

2. Internal: Medium restrictions, internal AI models only.

3. Sensitive: Tight restrictions, mandatory review and no external data transfer.

• User Confirmation: A UI element asks the employee to confirm the suggested tag to ensure accuracy.

### 4.3 Policy Enforcement Engine, Middleware

• System Prompt Injection: The Leader’s Policy is injected into the Workflow Agent as a mandatory instruction block.

• Integration Filtering: A post processing step removes any AI generated suggestions that:

  • Use unapproved third party tools.

  • Propose sending Sensitive data to external providers.

  • Hard Blocks: UI prevention of publishing a workflow that violates a Tight data policy.

  • Soft Warnings: Flagging review required workflows for mandatory leader approval before activation.

### 4.4 Leadership Dashboard, MVP Widgets

• Policy Snapshot: A summary card showing the current Laws of the Team.

• Approval Queue: A notification center for workflows flagged as Review Required or Exception Requested.

• Audit Trail: A timeline view showing:

  • Policy changes.

  • Blocked policy violations.

  • Approvals granted.

• Compliance Health: Simple counters:

  • Compliant Workflows, Green

  • Pending Review, Yellow

  • Blocked Attempts, Red

## 5. Logic Hooks and Integration Points

### Workflow Builder Hook

• Timing: Triggers during the Integrate and Optimize phase.

• Logic:

1. Identify step sensitivity.

2. Cross reference with Leader Policy.

3. If Violation equals True: Block suggestion and display a Reasoning Banner, for example “Blocked by Team Policy on External Data Sharing.”

4. If Review_Required equals True: Allow suggestion and add Approval Required flag.

### Dashboard Hook

• Timing: Triggers on workflow submission or policy violation.

• Logic: Populate the Audit Trail and Approval Queue based on tags generated during the workflow building session.

## 6. Design Constraints for AI Implementation

• Persona Isolation: The Leader Dashboard is accessible only to users with Manager or Admin roles.

• Transparency First: Every time the AI blocks an action, it must cite the specific policy rule to the employee.

• No Hallucinations: The enforcement engine must use deterministic if then logic for the final filter, even if suggestions are AI generated.

• Single Team Scope: The MVP assumes one policy applies to the entire team managed by the leader.

````
