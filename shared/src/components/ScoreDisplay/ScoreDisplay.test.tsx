import { render, screen } from '@testing-library/react';
import { axe } from 'vitest-axe';
import { ScoreDisplay } from './ScoreDisplay';

describe('ScoreDisplay', () => {
  it('renders the score', () => {
    render(<ScoreDisplay score={850} />);
    expect(screen.getByText('850')).toBeInTheDocument();
  });

  it('renders stars when showStars is true', () => {
    render(<ScoreDisplay score={60} maxScore={100} showStars starCount={5} />);
    // 60/100 = 60%, out of 5 stars = 3 filled
    const stars = screen.getAllByRole('img', { hidden: true });
    expect(stars).toHaveLength(5);
  });

  it('does not render stars by default', () => {
    render(<ScoreDisplay score={50} />);
    expect(screen.queryByRole('img', { hidden: true })).not.toBeInTheDocument();
  });

  it('has correct aria-label with score only', () => {
    render(<ScoreDisplay score={750} />);
    expect(screen.getByLabelText('Score: 750')).toBeInTheDocument();
  });

  it('has correct aria-label with score and max', () => {
    render(<ScoreDisplay score={80} maxScore={100} />);
    expect(screen.getByLabelText('Score: 80 out of 100')).toBeInTheDocument();
  });

  it('has correct aria-label with stars', () => {
    render(<ScoreDisplay score={80} maxScore={100} showStars starCount={5} />);
    expect(screen.getByLabelText('Score: 80 out of 100, 4 of 5 stars')).toBeInTheDocument();
  });

  it('has no accessibility violations', async () => {
    const { container } = render(<ScoreDisplay score={5} maxScore={10} />);
    expect(await axe(container)).toHaveNoViolations();
  });
});
