import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { axe } from 'vitest-axe';
import { LevelIndicator } from '../components/LevelIndicator';

describe('LevelIndicator', () => {
  it('renders the translated level text', () => {
    render(<LevelIndicator current={2} total={5} />);
    expect(screen.getByLabelText('levelOf')).toBeTruthy();
  });

  it('includes a star icon that is hidden from assistive tech', () => {
    const { container } = render(<LevelIndicator current={1} total={5} />);
    const star = container.querySelector('[aria-hidden="true"]');
    expect(star?.textContent).toBe('⭐');
  });

  it('has no accessibility violations', async () => {
    const { container } = render(<LevelIndicator current={1} total={5} />);
    expect(await axe(container)).toHaveNoViolations();
  });
});
