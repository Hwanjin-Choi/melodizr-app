import * as FileSystem from "expo-file-system/legacy";

// Define expected response structure here based on the API
// But actually, we return a string URI now
export interface UploadResponse {
  output_audio_url?: string;
  message?: string;
  local_uri?: string;
  [key: string]: any;
}

const API_Endpoint = "http://67.70.78.39:57476/melodizr_api/";
const USER_ID = "test_user";

export const uploadRecording = async (
  audioUri: string,
  mode: string,
  instrument: string,
  chordPattern: string = "strum_down"
): Promise<UploadResponse> => {
  try {
    console.log(`[API] Uploading: Mode=${mode}, Inst=${instrument}, Pattern=${chordPattern}`);

    const formData = new FormData();

    // Determine file type from URI
    const uriParts = audioUri.split(".");
    const fileType = uriParts[uriParts.length - 1];
    const filename = `recording.${fileType}`;
    const mimeType = fileType === "m4a" ? "audio/x-m4a" : "audio/wav";

    // @ts-ignore: React Native FormData
    formData.append("audio", {
      uri: audioUri,
      name: filename,
      type: mimeType,
    });

    formData.append("user_id", USER_ID);
    formData.append("mode", mode);
    formData.append("instrument", instrument);
    formData.append("chord_pattern", chordPattern);
    formData.append("wav_only", "true");

    // DEBUG: Log FormData contents
    console.log(`========== [API] Uploading: ${filename} ==========`);

    // Revert to fetch now that network is fixed
    const response = await fetch(API_Endpoint, {
      method: "POST",
      body: formData,
      headers: {
        Expect: "",
        Accept: "*/*",
        Connection: "keep-alive",
      },
    });

    console.log("[API] Response Status:", response.status);
    console.log("[API] Response Headers:", JSON.stringify(response.headers, null, 2));

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[API Error]", response.status, errorText);
      throw new Error(`API Error (${response.status}): ${errorText}`);
    }

    // Check Content-Type to see what "is coming"
    const contentType = response.headers.get("Content-Type") || "";
    console.log("[API] Content-Type:", contentType);

    // Check Content-Disposition for filename
    const contentDisposition = response.headers.get("Content-Disposition");
    let serverFilename = `converted_${Date.now()}.wav`;

    if (contentDisposition) {
      const match = contentDisposition.match(/filename="?([^"]+)"?/);
      if (match && match[1]) {
        serverFilename = match[1];
      }
    }

    // If it's audio, handle as blob
    if (
      contentType.includes("audio") ||
      contentType.includes("wav") ||
      contentType.includes("octet-stream")
    ) {
      console.log("[API] Received Audio. Filename:", serverFilename);
      // Handle Blob Response (Binary WAV)
      const blob = await response.blob();

      const reader = new FileReader();
      return new Promise((resolve, reject) => {
        reader.onerror = () => {
          console.error("FileReader Error");
          reject(new Error("Failed to read response blob"));
        };

        reader.onloadend = async () => {
          try {
            const resultString = reader.result as string;
            const splitResult = resultString.split(",");

            if (splitResult.length < 2) {
              throw new Error("Invalid Data URL format from server");
            }

            const base64data = splitResult[1];
            // Use serverFilename for saving
            const newPath = `${FileSystem.documentDirectory}${serverFilename}`;

            await FileSystem.writeAsStringAsync(newPath, base64data, {
              encoding: FileSystem.EncodingType.Base64,
            });

            console.log("[API] Conversion Success, Saved to:", newPath);

            resolve({
              output_audio_url: newPath,
              local_uri: newPath,
              message: "Success (WAV received)",
            });
          } catch (e) {
            reject(e);
          }
        };

        reader.readAsDataURL(blob);
      });
    } else {
      // Assume text/json if not audio
      const text = await response.text();
      console.log("[API] Received Text/JSON:", text.substring(0, 500));

      let json;
      try {
        json = JSON.parse(text);
      } catch (e) {
        // Not JSON
      }

      return {
        message: "Received non-audio response",
        data: json || text,
        output_audio_url: audioUri,
      };
    }
  } catch (error) {
    console.error("Upload failed details:", error);
    throw error;
  }
};
