import '@testing-library/jest-dom/vitest';
import * as axeMatchers from 'vitest-axe/matchers';
import { expect } from 'vitest';
import '../../../platform/src/i18n';
expect.extend(axeMatchers);
