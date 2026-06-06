import { showFailureToast } from "@raycast/utils";

export default async function main() {
  try {
    // TODO
  } catch (error) {
    showFailureToast("Failed to increase volume", { message: String(error) });
  }
}
