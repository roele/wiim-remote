import { showFailureToast } from "@raycast/utils";

export default async function main() {
  try {
    // TODO
  } catch (error) {
    showFailureToast("Failed to skip to the next track", { message: String(error) });
  }
}
