import { List, ActionPanel, Action, showToast, Toast, Icon, useNavigation } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { useEffect, useState } from "react";
import { WiiMAPI } from "./wiim/api";
import { WiiMAPIError } from "./wiim/errors";
import { resolveDevice } from "./wiim/discovery";

export default function Command() {
  const { pop } = useNavigation();
  const [isLoading, setIsLoading] = useState(true);
  const [presets, setPresets] = useState<string[]>([]);

  useEffect(() => {
    resolveDevice()
      .then((device) => new WiiMAPI(device).getEQPresets())
      .then(setPresets)
      .catch((error) => {
        const hint = error instanceof WiiMAPIError ? error.getHint() : { title: "Error", message: String(error) };
        showFailureToast(hint.title, { message: hint.message });
      })
      .finally(() => setIsLoading(false));
  }, []);

  async function handleSelect(index: number, name: string) {
    try {
      const device = await resolveDevice();
      await new WiiMAPI(device).setEQPreset(index);
      await showToast({ style: Toast.Style.Success, title: `EQ: ${name}` });
      pop();
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
    <List navigationTitle="Set EQ Preset" isLoading={isLoading}>
      {presets.map((name, index) => (
        <List.Item
          key={index}
          icon={Icon.Waveform}
          title={name}
          subtitle={`Preset ${index}`}
          actions={
            <ActionPanel>
              <Action title="Apply EQ Preset" onAction={() => handleSelect(index, name)} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
