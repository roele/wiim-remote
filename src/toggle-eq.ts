import { showFailureToast } from "@raycast/utils";
import { showToast, Toast, LocalStorage } from "@raycast/api";
import { WiiMAPI } from "./wiim/api";
import { WiiMAPIError } from "./wiim/errors";
import { resolveDevice } from "./wiim/discovery";

const EQ_STATE_KEY = "wiim_eq_enabled";

export default async function main() {
  try {
    const stored = await LocalStorage.getItem<string>(EQ_STATE_KEY);
    const wasEnabled = stored === "true";
    const newState = !wasEnabled;

    const device = await resolveDevice();
    const api = new WiiMAPI(device);
    await api.toggleEQ(newState);
    await LocalStorage.setItem(EQ_STATE_KEY, String(newState));
    await showToast({ style: Toast.Style.Success, title: `EQ ${newState ? "Enabled" : "Disabled"}` });
  } catch (error) {
    if (error instanceof WiiMAPIError) {
      const hint = error.getHint();
      showFailureToast(hint.title, { message: hint.message });
    } else {
      showFailureToast("Failed to toggle EQ", { message: String(error) });
    }
  }
}
