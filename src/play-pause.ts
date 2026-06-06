import { showFailureToast } from "@raycast/utils";

export default async function main() {
  try {
    // TODO
  } catch (error) {
    showFailureToast("Failed to toggle playback", { message: String(error) });
  }
}
