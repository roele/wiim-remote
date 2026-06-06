import { List, ActionPanel, Action, showToast, Toast, Icon } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { WiiMAPI } from "./wiim/api";
import { WiiMAPIError } from "./wiim/errors";
import { resolveDevice } from "./wiim/discovery";

const EQ_PRESETS = [
  "Flat",
  "Acoustic",
  "Bass Booster",
  "Bass Reducer",
  "Classical",
  "Dance",
  "Deep",
  "Electronic",
  "Hip-Hop",
  "Jazz",
  "Latin",
  "Loudness",
  "Lounge",
  "Piano",
  "Pop",
  "R&B",
  "Rock",
  "Small Speakers",
  "Spoken Word",
  "Treble Booster",
  "Treble Reducer",
  "Vocal Booster",
];

export default function Command() {
  async function handleSelect(index: number) {
    try {
      const device = await resolveDevice();
      const api = new WiiMAPI(device);
      await api.setEQPreset(index);
      await showToast({ style: Toast.Style.Success, title: `EQ: ${EQ_PRESETS[index]}` });
    } catch (error) {
      if (error instanceof WiiMAPIError) {
        const hint = error.getHint();
        showFailureToast(hint.title, { message: hint.message });
      } else {
        showFailureToast("Failed to set EQ preset", { message: String(error) });
      }
    }
  }

  return (
    <List navigationTitle="Set EQ Preset">
      {EQ_PRESETS.map((name, index) => (
        <List.Item
          key={index}
          icon={Icon.Waveform}
          title={name}
          subtitle={`Preset ${index}`}
          actions={
            <ActionPanel>
              <Action title="Apply EQ Preset" onAction={() => handleSelect(index)} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
