
---

# Skills-Based Hiring & Internal Coverage Canvas

**Feature Proposal**

---

# 1. Context

The system currently includes a **Role Coverage Matrix** that displays:

* Production and business roles
* Active headcount
* Employee skills
* Risk exposure

This feature extends the matrix by introducing a **skills-first hiring workflow** that helps HR determine whether a need should be fulfilled by:

* **External hiring**, or
* **Internal coverage** through reskilling, reassignment, or internal mobility.

---

# 2. Feature Objective

Enable HR managers to **initiate hiring based on required skills rather than job titles**, while simultaneously visualizing **real-time internal skill coverage**.

This allows HR to:

* Identify internal candidates before opening external hiring.
* Understand skill gaps at an organizational level.
* Make more informed workforce planning decisions.

---

# 3. User Flow Overview

## 3.1 Entry Point

Within the **Role Coverage Matrix**, add a contextual action button such as:

* **Hire for Skills**
* **Add Skill-Based Role**
* **Address Coverage Gap**

Clicking this button opens a **new view inside the HR Board**.

---

# 4. Skills Canvas (Job Description Builder)

The new view is a **canvas-style workspace** for defining a hiring need or role.

Instead of starting with a job title, HR begins by constructing a **target skill set**.

### Core Component

A **searchable multi-select input** for selecting skills.

---

# 5. Skills Library

The skills selector should search across two sources:

### 1. Existing Organizational Skills

Skills currently mapped to employees in the system.

### 2. Future Skills

Predefined skills that may **not yet exist within the organization** but are relevant for future roles.

---

### Skill Metadata

Each skill can include optional metadata such as:

* **Skill Category**

  * Technical
  * Soft
  * Compliance
  * Leadership
  * Other

* **Proficiency Level** *(optional)*

* **Criticality**

  * Must-Have
  * Nice-to-Have

---

# 6. Skill Set Construction

HR can **add or remove skills dynamically** to define the role.

Over time, the canvas becomes a **skills-based job description**, rather than a title-based one.

This supports more flexible hiring and workforce planning.

---

# 7. Real-Time Internal Coverage Analysis

## Live Coverage Table

Alongside the canvas, display a **real-time table** showing:

* Employees with matching skills
* **Degree of match** (e.g., percentage overlap with required skills)
* **Skill gaps per employee** (missing skills)

The table updates **instantly** as skills are added or removed.

---

# 8. Internal Hiring Insight

The system should provide clear insights on whether the role can be filled internally.

This includes signals such as:

* **Fully coverable internally**
* **Coverable with partial upskilling**
* **External hiring required**

### Risk Indicators

The system should highlight risks such as:

* **Single-point-of-failure skills**
* **Overloading critical employees**
* **Skill concentration in too few individuals**

---

# 9. Outcomes & Decisions

## HR Decision Support

HR can take several actions from the canvas:

### 1. External Hiring

Proceed with external recruitment using the **generated skill set as the job description**.

### 2. Internal Mobility

Flag internal employees for:

* Reskilling
* Reassignment
* Internal promotion

### 3. Save for Later

The canvas can be saved as:

* **A job description draft**
* **A future role**
* **A talent pipeline need**

---

# 10. Design & UX Principles

The feature should follow these principles:

* **Skills-first, not role-first**
* **Real-time feedback and transparency**
* **Minimal friction between analysis and action**
* **Clear distinction between existing coverage and true skill gaps**

---

# 11. Success Criteria

The feature is successful if:

* HR can define hiring needs **without starting from job titles**
* **Internal mobility opportunities become visible** before external hiring
* Skill gaps become **explicit, measurable, and reusable**
* The workflow **integrates naturally with the Role Coverage Matrix**


