import { render, screen } from '@testing-library/react';
import { axe } from 'vitest-axe';
import { ProgressBar } from './ProgressBar';

describe('ProgressBar', () => {
  it('renders with correct percentage width', () => {
    const { container } = render(<ProgressBar current={3} total={10} />);
    const fill = container.querySelector('[class*="fill"]');
    expect(fill).toHaveStyle({ width: '30%' });
  });

  it('renders label when showLabel is true', () => {
    render(<ProgressBar current={3} total={10} showLabel />);
    expect(screen.getByText('3 of 10')).toBeInTheDocument();
  });

  it('renders custom label', () => {
    render(
      <ProgressBar current={3} total={10} showLabel label="Question 3 of 10" />,
    );
    expect(screen.getByText('Question 3 of 10')).toBeInTheDocument();
  });

  it('does not render label by default', () => {
    render(<ProgressBar current={3} total={10} />);
    expect(screen.queryByText('3 of 10')).not.toBeInTheDocument();
  });

  it('has correct ARIA attributes', () => {
    render(<ProgressBar current={3} total={10} />);
    const bar = screen.getByRole('progressbar');
    expect(bar).toHaveAttribute('aria-valuenow', '3');
    expect(bar).toHaveAttribute('aria-valuemin', '0');
    expect(bar).toHaveAttribute('aria-valuemax', '10');
  });

  it('clamps percentage between 0 and 100', () => {
    const { container } = render(<ProgressBar current={15} total={10} />);
    const fill = container.querySelector('[class*="fill"]');
    expect(fill).toHaveStyle({ width: '100%' });
  });

  it('has no accessibility violations', async () => {
    const { container } = render(<ProgressBar current={3} total={10} showLabel />);
    expect(await axe(container)).toHaveNoViolations();
  });
});
