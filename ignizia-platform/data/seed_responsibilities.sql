-- Seed responsibilities data for occupations table
-- Using existing role_id values to update each role

-- Office Administrator
UPDATE occupations SET responsibilities = '[
    "Manage office documentation and filing systems",
    "Perform ERP data entry and administrative updates",
    "Coordinate schedules, meetings, and internal communications",
    "Support procurement and finance with documentation tasks",
    "Maintain office supplies and administrative inventory",
    "Prepare reports and administrative correspondence",
    "Support cross-department coordination activities",
    "Ensure general office organization and efficiency"
]'::jsonb WHERE role_id = '02d9e827-e840-492c-80f0-4c4317399489';

-- Warehouse Operator
UPDATE occupations SET responsibilities = '[
    "Receive incoming materials and verify documentation",
    "Record inventory transactions in ERP system",
    "Store materials according to warehouse layout and standards",
    "Pick and prepare materials for production orders",
    "Perform packing, labeling, and dispatch activities",
    "Operate forklift safely for material movement",
    "Monitor stock levels and report discrepancies",
    "Execute FIFO/FEFO stock rotation",
    "Maintain warehouse cleanliness and safety compliance"
]'::jsonb WHERE role_id = '212ac0d0-218d-4d34-abac-6b361f57c785';

-- AI Systems Monitor
UPDATE occupations SET responsibilities = '[
    "Monitor AI visual inspection system performance metrics",
    "Review flagged defects and validate system outputs",
    "Analyze false positives and false negatives",
    "Coordinate data labeling and feedback loops for model improvement",
    "Escalate system anomalies to IT or Quality teams",
    "Generate performance reports and trend analyses",
    "Ensure ERP integration accuracy for inspection data",
    "Support system troubleshooting and updates",
    "Document system performance and improvement actions"
]'::jsonb WHERE role_id = '457a4c1b-8c6f-4844-b039-e7fe7ce8cecf';

-- Production Supervisor
UPDATE occupations SET responsibilities = '[
    "Plan and coordinate daily production activities",
    "Allocate workforce according to production schedule",
    "Monitor production output against KPIs and targets",
    "Ensure compliance with quality and safety standards",
    "Conduct shift briefings and performance follow-ups",
    "Address operational issues and production bottlenecks",
    "Approve incident and deviation reports",
    "Coach and support team leaders and operators",
    "Implement continuous improvement initiatives"
]'::jsonb WHERE role_id = '47e938ea-7c3c-4920-a836-f58c0b511e51';

-- Maintenance Technician
UPDATE occupations SET responsibilities = '[
    "Perform preventive maintenance according to maintenance schedule",
    "Diagnose and repair mechanical and electrical faults",
    "Respond to equipment breakdowns to minimize downtime",
    "Conduct corrective maintenance on machines and utilities",
    "Implement lock-out/tag-out procedures during interventions",
    "Maintain maintenance logs and technical documentation",
    "Monitor spare parts inventory and request replacements",
    "Support equipment installation and commissioning",
    "Communicate machine status updates to production teams"
]'::jsonb WHERE role_id = '57f4e512-e331-40c7-8820-60486d4fcac8';

-- Stitching Operator
UPDATE occupations SET responsibilities = '[
    "Review production orders, patterns, and material specifications before stitching",
    "Set up and adjust sewing machines according to product requirements",
    "Execute stitching operations according to SOP and quality standards",
    "Monitor stitch consistency and seam accuracy during production",
    "Perform in-process self-inspection of stitched components",
    "Report defects, material issues, or machine malfunctions to supervisor",
    "Maintain required production pace to meet daily targets",
    "Ensure proper handling of leather and materials to avoid damage",
    "Maintain workstation cleanliness and safety compliance"
]'::jsonb WHERE role_id = '8227389d-f233-485a-97a5-f1233fed4741';

-- Chemical Safety Officer
UPDATE occupations SET responsibilities = '[
    "Monitor chemical storage and handling compliance",
    "Review and interpret MSDS documentation",
    "Conduct hazard identification and risk assessments",
    "Enforce PPE compliance in chemical handling areas",
    "Investigate chemical-related incidents and prepare reports",
    "Train employees on chemical safety procedures",
    "Ensure compliance with local and international regulations",
    "Coordinate emergency response in case of chemical incidents",
    "Monitor environmental safety practices and waste disposal"
]'::jsonb WHERE role_id = '9ded2aa2-23ab-4e99-abda-bd833e690a65';

-- Supply Chain Planner
UPDATE occupations SET responsibilities = '[
    "Develop demand and supply plans based on forecasts",
    "Analyze forecast accuracy and adjust planning parameters",
    "Plan production capacity in coordination with operations",
    "Optimize inventory levels to balance cost and availability",
    "Conduct scenario analysis for demand variability",
    "Identify supply chain risks and mitigation plans",
    "Coordinate S&OP meetings and planning reviews",
    "Monitor planning KPIs and performance metrics",
    "Communicate supply constraints and trade-offs to stakeholders"
]'::jsonb WHERE role_id = 'bc03280f-9376-4e90-b5df-613338406a36';

-- HR & Payroll Coordinator
UPDATE occupations SET responsibilities = '[
    "Process monthly payroll and statutory deductions",
    "Maintain employee records and HR documentation",
    "Ensure compliance with labor laws and company policies",
    "Administer employee benefits programs",
    "Update employee data in HRIS/ERP systems",
    "Respond to employee payroll and HR inquiries",
    "Prepare payroll and HR reports",
    "Coordinate onboarding and offboarding documentation"
]'::jsonb WHERE role_id = 'c92988f6-1240-4201-9994-c1ee111a5db4';

-- Vendor Relations Coordinator
UPDATE occupations SET responsibilities = '[
    "Maintain ongoing communication with suppliers",
    "Support contract negotiation processes",
    "Monitor supplier performance (OTD, quality metrics)",
    "Document supplier correspondence and agreements",
    "Update and maintain vendor records in ERP",
    "Facilitate resolution of supplier disputes",
    "Align supplier expectations with company requirements",
    "Coordinate supplier evaluations and reviews"
]'::jsonb WHERE role_id = 'cbd0a553-6da2-4ba0-b93e-be943b6abe38';

-- Cutting Machine Operator
UPDATE occupations SET responsibilities = '[
    "Review cutting plans, patterns, and material specifications",
    "Prepare and position materials for optimal yield",
    "Operate cutting machines (manual or automated) according to plan",
    "Optimize material layout to minimize waste",
    "Inspect cut components for dimensional accuracy",
    "Perform machine calibration and basic preventive checks",
    "Report blade wear, machine issues, or material defects",
    "Maintain cutting area safety and compliance standards",
    "Record material usage and production data"
]'::jsonb WHERE role_id = 'd9b7213b-7f1a-43dd-b3b9-5838cb61cbc4';

-- Cost Accountant
UPDATE occupations SET responsibilities = '[
    "Calculate product costs using BOM and routing data",
    "Perform variance analysis and investigate deviations",
    "Prepare cost reports for management review",
    "Monitor production cost performance against budget",
    "Update standard costs in ERP system",
    "Support budgeting and financial forecasting processes",
    "Provide financial insights to operations and procurement",
    "Ensure accuracy of cost data and financial documentation"
]'::jsonb WHERE role_id = 'df763665-fc48-4cd9-9a13-ab3db54b06ae';

-- Quality Inspector
UPDATE occupations SET responsibilities = '[
    "Inspect finished and in-process products against quality standards",
    "Measure components using calipers, gauges, and inspection tools",
    "Classify and document defects according to established criteria",
    "Approve or reject products based on inspection findings",
    "Escalate recurring quality issues to production or management",
    "Maintain inspection records and traceability documentation",
    "Support root-cause analysis investigations",
    "Monitor compliance with quality procedures",
    "Ensure inspection area safety compliance"
]'::jsonb WHERE role_id = 'e220963c-f059-4ddb-a06d-b3b3cd2be394';

-- Procurement Specialist
UPDATE occupations SET responsibilities = '[
    "Develop sourcing strategies for materials and services",
    "Evaluate and select suppliers based on performance criteria",
    "Conduct cost analysis and negotiate commercial terms",
    "Review contracts and ensure policy compliance",
    "Monitor supplier risk and dependency levels",
    "Coordinate with planning and finance for procurement alignment",
    "Track supplier performance metrics",
    "Ensure procurement documentation accuracy",
    "Support continuous supplier performance improvement"
]'::jsonb WHERE role_id = 'ef40df82-4f9e-4687-9400-49eb4df8f6b0';

-- Buyer
UPDATE occupations SET responsibilities = '[
    "Process purchase orders in ERP system",
    "Source materials based on approved supplier lists",
    "Communicate with suppliers regarding orders and delivery schedules",
    "Track deliveries and follow up on delays",
    "Compare quotations and support cost evaluations",
    "Coordinate with warehouse and planning teams",
    "Verify order accuracy and documentation completeness",
    "Resolve discrepancies in deliveries or invoices"
]'::jsonb WHERE role_id = 'fa84bbd7-2b10-4494-a575-b9a7982c9f20';
