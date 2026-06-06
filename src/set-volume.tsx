import { Form, ActionPanel, Action, showToast, Toast } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { useState } from "react";
import { WiiMAPI } from "./wiim/api";
import { WiiMAPIError } from "./wiim/errors";
import { resolveDevice } from "./wiim/discovery";

interface Values {
  volume: string;
}

export default function Command() {
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(values: Values) {
    const volume = parseInt(values.volume, 10);
    if (isNaN(volume) || volume < 0 || volume > 100) {
      await showToast({ style: Toast.Style.Failure, title: "Invalid volume", message: "Enter a number between 0 and 100" });
      return;
    }
    setIsLoading(true);
    try {
      const device = await resolveDevice();
      const api = new WiiMAPI(device);
      await api.setVolume(volume);
      await showToast({ style: Toast.Style.Success, title: `Volume set to ${volume}` });
    } catch (error) {
      if (error instanceof WiiMAPIError) {
        const hint = error.getHint();
        showFailureToast(hint.title, { message: hint.message });
      } else {
        showFailureToast("Failed to set volume", { message: String(error) });
      }
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Set Volume" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField id="volume" title="Volume (0–100)" placeholder="50" />
    </Form>
  );
}
