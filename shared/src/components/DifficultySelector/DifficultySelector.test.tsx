import { render, screen, fireEvent } from '@testing-library/react';
import { DifficultySelector } from './DifficultySelector';

describe('DifficultySelector', () => {
  it('renders the correct number of stars', () => {
    render(
      <DifficultySelector current={3} onChange={vi.fn()} levels={5} />,
    );
    const group = screen.getByRole('radiogroup');
    const radios = screen.getAllByRole('radio');
    expect(group).toBeInTheDocument();
    expect(radios).toHaveLength(5);
  });

  it('fires onChange with the selected level', () => {
    const onChange = vi.fn();
    render(<DifficultySelector current={1} onChange={onChange} />);
    const radios = screen.getAllByRole('radio');
    fireEvent.click(radios[2]); // click 3rd star
    expect(onChange).toHaveBeenCalledWith(3);
  });

  it('shows label for current level', () => {
    render(
      <DifficultySelector
        current={3}
        onChange={vi.fn()}
        labels={['Very Easy', 'Easy', 'Medium', 'Hard', 'Very Hard']}
      />,
    );
    expect(screen.getByText('Medium')).toBeInTheDocument();
  });

  it('navigates with arrow keys', () => {
    const onChange = vi.fn();
    render(<DifficultySelector current={3} onChange={onChange} />);
    const group = screen.getByRole('radiogroup');
    fireEvent.keyDown(group, { key: 'ArrowRight' });
    expect(onChange).toHaveBeenCalledWith(4);
  });

  it('wraps around on arrow key at boundaries', () => {
    const onChange = vi.fn();
    render(<DifficultySelector current={5} onChange={onChange} levels={5} />);
    const group = screen.getByRole('radiogroup');
    fireEvent.keyDown(group, { key: 'ArrowRight' });
    expect(onChange).toHaveBeenCalledWith(1);
  });

  it('marks the correct star as checked', () => {
    render(<DifficultySelector current={2} onChange={vi.fn()} />);
    const radios = screen.getAllByRole('radio');
    expect(radios[1]).toHaveAttribute('aria-checked', 'true');
    expect(radios[0]).toHaveAttribute('aria-checked', 'false');
  });
});
