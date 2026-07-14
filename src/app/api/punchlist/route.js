import { NextResponse } from "next/server";

// Hardcoded Power Automate endpoints from the user request
const POWER_AUTOMATE_POST_URL = "https://default88913293a40c41c2a8eb65a54eefe2.09.environment.api.powerplatform.com:443/powerautomate/automations/direct/cu/11/workflows/11a922fa7c03498992ef8f337f050be2/triggers/manual/paths/invoke?api-version=1&sp=%2Ftriggers%2Fmanual%2Frun&sv=1.0&sig=7rWfWqLXkoXubNCK7jqbkf5vP8LtbVSE1mKbeV8wtWY";
const POWER_AUTOMATE_PATCH_URL = "https://default88913293a40c41c2a8eb65a54eefe2.09.environment.api.powerplatform.com:443/powerautomate/automations/direct/cu/02/workflows/055d85c5abfc45ef8123e5b968d534ad/triggers/manual/paths/invoke?api-version=1&sp=%2Ftriggers%2Fmanual%2Frun&sv=1.0&sig=LmiMgcHt6Q8Lab2Ra9YODUfyyiMPoqrgh2t1FT96_iY";

// Global in-memory fallback store for Vercel/local testing when GET URL is not configured
// Pre-populated with high-end customer success examples for AMR fleet commissioning.
let mockPunchlist = [
  {
    id: 101,
    title: "AMR-03 Localization Failure at Charger 1",
    description: "Robot experiences position drift when backing into charger. Lidar reflections from nearby high-gloss floor coating are causing beam scattering. Needs reflector alignment or sensor masking.",
    status: "In Progress",
    task_owner: "alex.tan@botsync.sg",
    target_closed_date: "2026-07-18",
    priority: "Critical",
    category: "Software",
    reported_by: "BMW Warehouse Ops"
  },
  {
    id: 102,
    title: "Safety Scanner Muted Warning at Turn-Zone B",
    description: "Safety PLC reports intermittent muting fault when turning at maximum payload. Suspect corner clearance is slightly below the 150mm tolerance threshold. Need to adjust trajectory path in FMS.",
    status: "Open",
    task_owner: "priya.sharma@botsync.sg",
    target_closed_date: "2026-07-22",
    priority: "High",
    category: "Safety",
    reported_by: "Safety Auditor"
  },
  {
    id: 103,
    title: "Trolley Lock Actuator Squeaking on BOX-02",
    description: "Pneumatic clamp on the BOX-02 robot makes high-pitch noise during engagement. Air regulator pressure is stable at 5.5 bar. Need to check mechanical alignment and apply grease.",
    status: "In Progress",
    task_owner: "marcus.lim@botsync.sg",
    target_closed_date: "2026-07-14",
    priority: "Medium",
    category: "Hardware",
    reported_by: "T. Somchai (Lead Tech)"
  },
  {
    id: 104,
    title: "FMS Map Drift after Wi-Fi AP Roaming",
    description: "AMR loses heartbeat for 2.5 seconds when roaming between AP-12 and AP-13 in the staging area. FMS reports map offset error. Need to optimize roaming parameters on the client interface.",
    status: "Closed",
    task_owner: "alex.tan@botsync.sg",
    target_closed_date: "2026-07-10",
    priority: "Critical",
    category: "Network",
    reported_by: "IT Manager"
  },
  {
    id: 105,
    title: "Incorrect Pallet Height Detection on Lift-01",
    description: "3D camera fails to detect pallets shorter than 120mm. Needs camera calibration update and threshold adjustment in the perception model config.",
    status: "Open",
    task_owner: "priya.sharma@botsync.sg",
    target_closed_date: "2026-07-25",
    priority: "Low",
    category: "Software",
    reported_by: "BMW Warehouse Ops"
  }
];

// Helper to normalize SharePoint/Power Automate item schemas to match dashboard frontend keys
function normalizeSharePointItem(item) {
  // Extract ID
  const id = item.id || item.ID || item.ItemInternalId;
  
  // Extract Title
  const title = item.title || item.Title || "";
  
  // Extract Description
  const description = item.description || item.Description || "";
  
  // Extract Status (can be a string or an object with 'Value')
  let status = "Open";
  if (item.Status) {
    status = typeof item.Status === "object" ? (item.Status.Value || "Open") : item.Status;
  } else if (item.status) {
    status = typeof item.status === "object" ? (item.status.Value || "Open") : item.status;
  }
  
  // Extract Task Owner (SharePoint field might be Owner or TaskOwner or task_owner)
  let task_owner = "";
  const rawOwner = item.task_owner || item.taskOwner || item.TaskOwner || item.Owner || item.owner;
  if (rawOwner) {
    task_owner = typeof rawOwner === "object" ? (rawOwner.Value || rawOwner.DisplayName || "") : rawOwner;
  }
  
  // Extract Target Closed Date (support TargetClosedDate, TargetCloseDate, and camel/snake variants)
  const target_closed_date = item.target_closed_date || item.targetClosedDate || item.TargetClosedDate || item.TargetCloseDate || item.targetCloseDate || item.target_close_date || item.target_date || "";
  
  // Extract Priority (can be a string or an object with 'Value')
  let priority = "Medium";
  const rawPriority = item.priority || item.Priority;
  if (rawPriority) {
    priority = typeof rawPriority === "object" ? (rawPriority.Value || "Medium") : rawPriority;
  }
  
  // Extract Category (can be a string or an object with 'Value')
  let category = "Other";
  const rawCategory = item.category || item.Category;
  if (rawCategory) {
    category = typeof rawCategory === "object" ? (rawCategory.Value || "Other") : rawCategory;
  }
  
  // Extract Reported By (can be a string or an object with 'Value' / 'DisplayName')
  let reported_by = "";
  const rawReporter = item.reported_by || item.ReportedBy || item.reportedBy;
  if (rawReporter) {
    reported_by = typeof rawReporter === "object" ? (rawReporter.Value || rawReporter.DisplayName || "") : rawReporter;
  }

  // Extract Note
  const note = item.note || item.Note || "";

  return {
    id,
    title,
    description,
    status,
    task_owner,
    target_closed_date,
    priority,
    category,
    reported_by,
    note
  };
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const statusQuery = searchParams.get("status");
    const getUrlOverride = request.headers.get("x-get-url") || searchParams.get("getUrl");
    const getUrl = process.env.GET_PUNCHLIST_URL || getUrlOverride;

    if (!getUrl) {
      // Mock Database Mode
      let filteredList = [...mockPunchlist];
      if (statusQuery) {
        filteredList = filteredList.filter(item => item.status.toLowerCase() === statusQuery.toLowerCase());
      }
      return NextResponse.json({
        mode: "mock",
        message: "Using mock fallback. Set GET_PUNCHLIST_URL in environment variables to connect live SharePoint data.",
        data: filteredList
      });
    }

    // Call Power Automate GET Flow
    // According to: GET Items: triggerOutputs()['queries']['status']
    const targetUrl = new URL(getUrl);
    if (statusQuery) {
      targetUrl.searchParams.set("status", statusQuery);
    }

    const response = await fetch(targetUrl.toString(), {
      method: "GET",
      headers: {
        "Accept": "application/json"
      }
    });

    if (!response.ok) {
      throw new Error(`Power Automate GET failed with status: ${response.status}`);
    }

    const responseText = await response.text();
    console.log("Power Automate GET Status:", response.status);
    console.log("Power Automate GET Headers:", Object.fromEntries(response.headers.entries()));
    console.log("Power Automate GET Raw Response:", responseText);
    let dataList = [];
    if (responseText && responseText.trim()) {
      try {
        const parsed = JSON.parse(responseText);
        dataList = Array.isArray(parsed) ? parsed : (parsed.value || parsed.data || []);
      } catch (err) {
        console.error("Failed to parse Power Automate GET JSON:", err, "Response text:", responseText);
      }
    }

    // Normalize data schema to standard frontend formats
    const normalizedList = dataList.map(normalizeSharePointItem);

    return NextResponse.json({
      mode: "live",
      data: normalizedList
    });
  } catch (error) {
    console.error("API GET Error:", error);
    return NextResponse.json(
      { error: "Failed to query punchlist", details: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { 
      title, 
      description, 
      status, 
      task_owner, 
      target_closed_date, 
      priority, 
      category, 
      reported_by, 
      ...extraFields 
    } = body;

    // Validate required fields
    if (!title || !description) {
      return NextResponse.json(
        { error: "Validation Error: 'title' and 'description' are required fields." },
        { status: 400 }
      );
    }

    const payload = {
      title,
      description,
      status: status || "Open",
      task_owner: task_owner || undefined,
      target_closed_date: target_closed_date || undefined,
      priority: priority || "Medium",
      category: category || "Other",
      reported_by: reported_by || undefined,
      note: body.note || undefined
    };

    // Remove any undefined keys so that empty optional fields aren't sent as empty strings
    // which triggers TriggerInputSchemaMismatch errors on format validations like 'date'.
    Object.keys(payload).forEach(key => payload[key] === undefined && delete payload[key]);

    const postUrl = process.env.POST_PUNCHLIST_URL || POWER_AUTOMATE_POST_URL;

    // If we are in mock mode (no postUrl set to anything real or fallback triggered)
    // and if the endpoint is disabled/unreachable, we update mock list
    let mockResult = null;
    if (process.env.MOCK_BACKEND === "true" || !postUrl) {
      const newId = mockPunchlist.length > 0 ? Math.max(...mockPunchlist.map(i => i.id)) + 1 : 101;
      const newItem = {
        id: newId,
        title: payload.title,
        description: payload.description,
        status: payload.status,
        task_owner: payload.task_owner || "",
        target_closed_date: payload.target_closed_date || "",
        priority: payload.priority || "Medium",
        category: payload.category || "Other",
        reported_by: payload.reported_by || "Customer Success Portal",
        note: payload.note || ""
      };
      mockPunchlist.unshift(newItem);
      mockResult = newItem;
    }

    if (!postUrl || process.env.MOCK_BACKEND === "true") {
      return NextResponse.json({
        mode: "mock",
        message: "Item created in mock storage successfully.",
        data: mockResult
      });
    }

    // Call Power Automate POST flow
    const response = await fetch(postUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Power Automate POST failed: ${response.status} - ${errorText}`);
    }

    // Also update our mock list to sync if running in hybrid mode
    const newId = mockPunchlist.length > 0 ? Math.max(...mockPunchlist.map(i => i.id)) + 1 : 101;
    const newItem = {
      id: newId,
      ...payload,
      task_owner: payload.task_owner || "",
      target_closed_date: payload.target_closed_date || "",
      reported_by: payload.reported_by || "Customer Success Portal",
      note: payload.note || ""
    };
    mockPunchlist.unshift(newItem);

    return NextResponse.json({
      mode: "live",
      message: "Punchlist item created successfully via Power Automate.",
      data: newItem
    });
  } catch (error) {
    console.error("API POST Error:", error);
    return NextResponse.json(
      { error: "Failed to create punchlist", details: error.message },
      { status: 500 }
    );
  }
}

export async function PATCH(request) {
  try {
    const body = await request.json();
    const { id, status, task_owner, note, ...extraFields } = body;

    if (!id) {
      return NextResponse.json(
        { error: "Validation Error: 'id' is a required field." },
        { status: 400 }
      );
    }

    // Build the payload matching the PATCH schema
    // To ensure strict compatibility with the user's Power Automate schema:
    const payload = {
      id: parseInt(id, 10),
      status: status || undefined,
      task_owner: task_owner || undefined,
      note: note || undefined
    };

    // Filter out undefined keys so we don't send null/undefined unless requested
    Object.keys(payload).forEach(key => payload[key] === undefined && delete payload[key]);

    const patchUrl = process.env.PATCH_PUNCHLIST_URL || POWER_AUTOMATE_PATCH_URL;

    // Update in mock storage
    const targetItemIndex = mockPunchlist.findIndex(item => item.id === payload.id);
    let mockUpdatedItem = null;
    if (targetItemIndex !== -1) {
      mockPunchlist[targetItemIndex] = {
        ...mockPunchlist[targetItemIndex],
        ...payload,
        note: payload.note !== undefined ? payload.note : mockPunchlist[targetItemIndex].note,
        priority: extraFields.priority || mockPunchlist[targetItemIndex].priority,
        category: extraFields.category || mockPunchlist[targetItemIndex].category,
        reported_by: extraFields.reported_by || mockPunchlist[targetItemIndex].reported_by
      };
      mockUpdatedItem = mockPunchlist[targetItemIndex];
    }

    if (!patchUrl || process.env.MOCK_BACKEND === "true") {
      return NextResponse.json({
        mode: "mock",
        message: "Item updated in mock storage successfully.",
        data: mockUpdatedItem
      });
    }

    // Call Power Automate PATCH flow
    const response = await fetch(patchUrl, {
      method: "PATCH", // Changed to PATCH as required by the Power Automate trigger settings
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Power Automate PATCH failed: ${response.status} - ${errorText}`);
    }

    return NextResponse.json({
      mode: "live",
      message: "Punchlist item updated successfully via Power Automate.",
      data: mockUpdatedItem
    });
  } catch (error) {
    console.error("API PATCH Error:", error);
    return NextResponse.json(
      { error: "Failed to update punchlist", details: error.message },
      { status: 500 }
    );
  }
}
