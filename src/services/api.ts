export const SPREADSHEET_API_URL = "https://script.google.com/macros/s/AKfycbxzYP59sDK5Bq9DVTkT3pTaV7LdJ_VErhmJzTNRZElaqovT53Pi2K54t7-zSKfpNUk2YA/exec";

export const sheetApi = {
  async getAllData() {
    try {
      const response = await fetch(`${SPREADSHEET_API_URL}?action=getAllData`);
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(JSON.stringify({
          error: errorData.error || `HTTP error! status: ${response.status}`,
          message: errorData.message || "",
          debugUrl: errorData.debug_url,
          isAuthError: errorData.is_auth_error
        }));
      }
      const text = await response.text();
      try {
        const result = JSON.parse(text);
        if (result.success === false) {
          throw new Error(result.error || "Lỗi không xác định từ Google Script");
        }
        return result.data;
      } catch (e: any) {
        console.error("Failed to parse API response as JSON:", text.substring(0, 200));
        throw new Error(e.message || "Dữ liệu trả về không hợp lệ. Kiểm tra Google Script.");
      }
    } catch (error) {
      console.error("Error fetching all data:", error);
      return null;
    }
  },

  async createRow(sheet: string, payload: any) {
    console.log(`Creating row in ${sheet}...`, payload);
    try {
      const response = await fetch(SPREADSHEET_API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "create",
          sheet,
          payload,
        }),
      });
      const result = await response.json();
      console.log(`Server response for create in ${sheet}:`, result);
      return result;
    } catch (error) {
      console.error(`Error creating row in ${sheet}:`, error);
      return null;
    }
  },

  async updateRow(sheet: string, payload: any) {
    try {
      const response = await fetch(SPREADSHEET_API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "update",
          sheet,
          payload,
        }),
      });
      return await response.json();
    } catch (error) {
      console.error(`Error updating row in ${sheet}:`, error);
      return null;
    }
  },

  async deleteRow(sheet: string, id: string) {
    try {
      const response = await fetch(SPREADSHEET_API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "delete",
          sheet,
          payload: { id },
        }),
      });
      return await response.json();
    } catch (error) {
      console.error(`Error deleting row from ${sheet}:`, error);
      return null;
    }
  },
};
