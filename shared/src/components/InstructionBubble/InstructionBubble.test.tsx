import { render, screen, fireEvent } from '@testing-library/react';
import { axe } from 'vitest-axe';
import { InstructionBubble } from './InstructionBubble';

describe('InstructionBubble', () => {
  it('renders the text', () => {
    render(<InstructionBubble text="Find the matching word!" />);
    expect(screen.getByText('Find the matching word!')).toBeInTheDocument();
  });

  it('shows audio button when audioSrc is provided', () => {
    render(<InstructionBubble text="Listen!" audioSrc="/audio/instruction.mp3" />);
    expect(screen.getByLabelText('Play instruction audio')).toBeInTheDocument();
  });

  it('does not show audio button when no audioSrc', () => {
    render(<InstructionBubble text="Just text" />);
    expect(screen.queryByLabelText('Play instruction audio')).not.toBeInTheDocument();
  });

  it('fires onAudioPlay when audio button is clicked', () => {
    const onAudioPlay = vi.fn();
    render(
      <InstructionBubble text="Listen!" audioSrc="/audio/test.mp3" onAudioPlay={onAudioPlay} />,
    );
    fireEvent.click(screen.getByLabelText('Play instruction audio'));
    expect(onAudioPlay).toHaveBeenCalledOnce();
  });

  it('renders character name when provided', () => {
    render(<InstructionBubble text="Hello!" character="Owl Helper" />);
    expect(screen.getByText('Owl Helper')).toBeInTheDocument();
  });

  it('has no accessibility violations', async () => {
    const { container } = render(<InstructionBubble text="Find the word!" />);
    expect(await axe(container)).toHaveNoViolations();
  });
});
