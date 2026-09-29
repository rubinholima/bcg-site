import { REQUIRED_MODULE_KEY } from '../auth/require-module.decorator';
import { MedicalEncountersController } from './medical-encounters.controller';

describe('MedicalEncounters RBAC', () => {
  it('exige módulo medico no controller (prontuário clínico)', () => {
    const modules = Reflect.getMetadata(REQUIRED_MODULE_KEY, MedicalEncountersController);
    expect(modules).toBe('medico');
  });
});
