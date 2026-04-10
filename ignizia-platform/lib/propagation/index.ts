export {
  PERSONAS,
  DEPARTMENTS,
  CANONICAL_RELATIONSHIPS,
  PERSONA_DEPARTMENT_RELATIONSHIPS,
  CANONICAL_GATES,
} from './registry';

export type { PersonaDef, DepartmentDef, CanonicalRelationship, PersonaDepartmentRelationship, CanonicalGate } from './registry';

export {
  expandStrategyPropagation,
  loadPropagationGraph,
  savePropagationGraph,
  clearAllPropagationGraphs,
} from './expand';
