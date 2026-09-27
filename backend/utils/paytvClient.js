const axios = require("axios");
const { wrapper } = require("axios-cookiejar-support");
const { CookieJar } = require("tough-cookie");
const cheerio = require("cheerio");
const { parseExcelBuffer, getField, toIdString } = require("./excelParser");

const BASE_URL = process.env.PAYTV_BASE_URL || "http://117.242.149.73";

let paytvClient = null;
let loginPromise = null;
let currentPaytvFranchiseId = null;

/* =========================================================
   PAYTV CLIENT
========================================================= */

const createClient = () => {
  const jar = new CookieJar();

  return wrapper(
    axios.create({
      baseURL: BASE_URL,
      jar,
      withCredentials: true,

      timeout: 60000,

      maxRedirects: 5,

      validateStatus: (status) => status < 500,

      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
          "(KHTML, like Gecko) Chrome/153.0.0.0 Safari/537.36",
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
    }),
  );
};

/* =========================================================
   LOGIN
========================================================= */

const loginToPaytv = async () => {
  if (paytvClient) {
    console.log("PayTV: reusing existing login session.");
    return paytvClient;
  }

  if (loginPromise) {
    return loginPromise;
  }

  loginPromise = (async () => {
    const client = createClient();

    try {
      console.log("PayTV: creating new login session...");

      // Login page open karke initial session/cookie establish
      await client.get("/UserLogin", {
        timeout: 60000,
      });

      const params = new URLSearchParams();

      params.append("username", process.env.PAYTV_USERNAME || "");

      params.append("password", process.env.PAYTV_PASSWORD || "");

      params.append("type", process.env.PAYTV_LOGIN_TYPE || "User");

      // IMPORTANT:
      // PayTV login ke 302 redirect ko Axios se
      // automatically follow nahi karna hai.
      const loginRes = await client.post("/UserLogin", params, {
        timeout: 60000,

        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },

        maxRedirects: 0,

        validateStatus: (status) => status >= 200 && status < 400,
      });

      const location = String(loginRes.headers?.location || "");

      const html = typeof loginRes.data === "string" ? loginRes.data : "";

      console.log("📺 PAYTV LOGIN RESPONSE:", {
        status: loginRes.status,
        location,
      });

      // ---------------------------------------------------
      // NORMAL SUCCESS CASE
      // PayTV successful login:
      // 302 -> /SelectLoginFranchise
      // Cookie jar mein session already save ho chuka hai.
      // Redirect follow karne ki zaroorat nahi hai.
      // ---------------------------------------------------

      const expectedLoginRedirect =
        loginRes.status >= 300 &&
        loginRes.status < 400 &&
        /\/SelectLoginFranchise/i.test(location);

      if (expectedLoginRedirect) {
        paytvClient = client;

        console.log("✅ PayTV login successful.");

        console.log("📺 PayTV login redirect:", location);

        return paytvClient;
      }

      // ---------------------------------------------------
      // 2xx response mein login page wapas aaya?
      // Means login failed.
      // ---------------------------------------------------

      const stillLoginPage =
        html.includes('name="username"') ||
        html.includes('id="username"') ||
        html.includes("UserLogin");

      if (stillLoginPage && loginRes.status < 300) {
        throw new Error(
          "PayTV login fail ho gaya. .env me PAYTV_USERNAME / PAYTV_PASSWORD check karein.",
        );
      }

      // ---------------------------------------------------
      // Unexpected redirect
      // ---------------------------------------------------

      if (loginRes.status >= 300 && loginRes.status < 400) {
        throw new Error(
          `Unexpected PayTV login redirect: ${location || "unknown"}`,
        );
      }

      // ---------------------------------------------------
      // Normal 2xx success
      // ---------------------------------------------------

      paytvClient = client;

      console.log("✅ PayTV login session created successfully.");

      return paytvClient;
    } catch (error) {
      paytvClient = null;

      console.error(
        "PayTV login error:",
        error.response?.status,
        error.code || "",
        error.message,
      );

      throw error;
    } finally {
      loginPromise = null;
    }
  })();

  return loginPromise;
};
/* =========================================================
   SESSION RESET
========================================================= */

const resetPaytvSession = () => {
  paytvClient = null;
  loginPromise = null;
  currentPaytvFranchiseId = null;

  console.log("PayTV: session reset.");
};

/* =========================================================
   SESSION REQUEST
   Login page aaye to ek baar session reset karke retry karega.
========================================================= */

const requestWithSession = async (requestFn, retry = true) => {
  const client = await loginToPaytv();

  try {
    const response = await requestFn(client);

    const html = typeof response.data === "string" ? response.data : "";

    const looksLikeLoginPage =
      html.includes('name="username"') && html.includes('name="password"');

    if (looksLikeLoginPage) {
      if (!retry) {
        throw new Error("PayTV session expired.");
      }

      resetPaytvSession();

      return requestWithSession(requestFn, false);
    }

    return response;
  } catch (error) {
    if (!retry) {
      throw error;
    }

    const status = error.response?.status;
    const code = error.code;

    // Session/auth problem
    if (status === 401 || status === 403) {
      resetPaytvSession();

      return requestWithSession(requestFn, false);
    }

    // Temporary network/PayTV server timeout
    if (
      code === "ETIMEDOUT" ||
      code === "ECONNRESET" ||
      code === "ECONNABORTED"
    ) {
      console.log(
        `📺 PayTV temporary network error: ${code} — retrying once...`,
      );

      return requestWithSession(requestFn, false);
    }

    throw error;
  }
};
const switchPaytvFranchise = async (franchiseId) => {
  const id = Number(franchiseId);

  if (!id) {
    throw new Error("PayTV Franchisee ID required.");
  }

  // Same franchise already selected hai
  if (currentPaytvFranchiseId === id) {
    console.log(`📺 PayTV franchise already active: ${id} — switch skipped.`);

    return {
      reused: true,
      franchiseId: id,
    };
  }

  const encodedFranchiseId = encodePaytvId(id);

  console.log(
    `📺 Switching PayTV franchise session: ${id} (${encodedFranchiseId})`,
  );

  const response = await requestWithSession((client) =>
    client.get(`/MultiFranchise/LoginOn/${encodedFranchiseId}`, {
      timeout: 60000,
    }),
  );

  if (response.status >= 400) {
    throw new Error(`PayTV franchise switch failed: HTTP ${response.status}`);
  }

  currentPaytvFranchiseId = id;

  console.log("✅ PayTV franchise session switched:", {
    franchiseId: id,
    status: response.status,
  });

  return response;
};
/* =========================================================
   HELPERS
========================================================= */

const cleanText = (value) => {
  return String(value || "")
    .replace(/\s+/g, " ")
    .trim();
};

const parseNumber = (value) => {
  const cleaned = String(value || "")
    .replace(/,/g, "")
    .replace(/[^\d.-]/g, "");

  const number = Number(cleaned);

  return Number.isFinite(number) ? number : 0;
};

const parseDateDDMMYYYY = (value) => {
  const text = cleanText(value);

  if (!text) return null;

  const monthMap = {
    jan: 1,
    january: 1,
    feb: 2,
    february: 2,
    mar: 3,
    march: 3,
    apr: 4,
    april: 4,
    may: 5,
    jun: 6,
    june: 6,
    jul: 7,
    july: 7,
    aug: 8,
    august: 8,
    sep: 9,
    sept: 9,
    september: 9,
    oct: 10,
    october: 10,
    nov: 11,
    november: 11,
    dec: 12,
    december: 12,
  };

  // 23/09/2026
  // 23-09-2026
  // 23/Sep/2026
  // 24/09/2026 00:00:00
  const match = text.match(/(\d{1,2})[\/-](\d{1,2}|[A-Za-z]+)[\/-](\d{4})/);

  if (!match) return null;

  const dd = Number(match[1]);
  const monthPart = String(match[2]).toLowerCase();
  const yyyy = Number(match[3]);

  const mm = /^\d+$/.test(monthPart) ? Number(monthPart) : monthMap[monthPart];

  if (!mm || mm < 1 || mm > 12) {
    return null;
  }

  const date = new Date(yyyy, mm - 1, dd);

  return Number.isNaN(date.getTime()) ? null : date;
};

const parseSelectedOption = ($, selector) => {
  const select = $(selector).first();

  if (!select.length) {
    return {
      id: null,
      name: "",
    };
  }

  let option = select.find("option[selected]").first();

  // Kuch PayTV pages selected attribute nahi dete,
  // lekin DOM property selected ho sakti hai.
  if (!option.length) {
    option = select
      .find("option")
      .filter((_, el) => {
        const propSelected = $(el).prop("selected");
        const attrSelected = $(el).attr("selected");

        return propSelected === true || attrSelected !== undefined;
      })
      .first();
  }

  if (!option.length) {
    return {
      id: null,
      name: "",
    };
  }

  const rawId = cleanText(option.attr("value"));
  const id = Number(rawId);

  return {
    id: Number.isFinite(id) ? id : null,
    name: cleanText(option.text()),
  };
};

const encodePaytvId = (id) => {
  return Buffer.from(String(id), "utf8").toString("base64");
};

/* =========================================================
   FIND PAYTV CUSTOMER
   PayTV /Json/GetSubscriberList supports name/code search.
========================================================= */

const findPaytvSubscriber = async (
  consumerId,
  { companyId = Number(process.env.PAYTV_COMPANY_ID || 1), franchiseId } = {},
) => {
  if (!consumerId) {
    throw new Error("Consumer ID required.");
  }

  if (!franchiseId) {
    throw new Error(
      `PayTV Franchisee ID available nahi hai for ${consumerId}.`,
    );
  }

  const response = await requestWithSession((client) =>
    client.get("/Json/GetSubscriberList/", {
      params: {
        clientName: String(consumerId).trim(),
        companyid: companyId,
        franchiseid: franchiseId,
      },
    }),
  );

  const data = Array.isArray(response.data) ? response.data : [];

  const exact = data.find((item) =>
    cleanText(item?.Text)
      .toUpperCase()
      .includes(String(consumerId).trim().toUpperCase()),
  );

  const item = exact || data[0];

  if (!item) {
    return null;
  }

  const customerId = Number(item.Value);

  if (!Number.isFinite(customerId) || customerId <= 0) {
    return null;
  }

  return {
    customerId,
    displayText: cleanText(item.Text),
    encodedId: encodePaytvId(customerId),
    companyId,
    franchiseId,
  };
};

/* =========================================================
   LIVE GENERAL INFO
========================================================= */
const getLiveSubscriberByEncodedId = async (encodedId, fallback = {}) => {
  if (!encodedId) {
    return {
      found: false,
    };
  }

  const generalRes = await requestWithSession((client) =>
    client.get(`/ManageSubscriber/EditGeneralInfo/${encodedId}`),
  );

  const $ = cheerio.load(
    typeof generalRes.data === "string" ? generalRes.data : "",
  );

  // ---------------------------------------------------------
  // NEW PayTV Hardware page
  // Example:
  // /HardwareService/Active/NjY4NTM=?ser=1
  // ---------------------------------------------------------
  const hardwareLink =
    $('a[href*="/HardwareService/Active/"]').first().attr("href") ||
    $('a[href*="/ManageSubscriber/ManageHadware/"]').first().attr("href") ||
    "";

  console.log(
    "📺 PayTV hardware link discovered:",
    hardwareLink || "NOT FOUND",
  );

  const readValue = (selector) => cleanText($(selector).attr("value"));

  const areaId = Number(readValue("#AreaID"));

  const franchiseeId = Number(readValue("#FranchiseeID"));

  return {
    found: true,

    customerId: Number(readValue("#ID")) || Number(fallback.customerId) || null,

    encodedId,

    hardwareUrl: hardwareLink || null,

    companyId:
      Number(readValue("#CompanyID")) || Number(fallback.companyId) || null,

    franchiseeId:
      Number.isFinite(franchiseeId) && franchiseeId > 0
        ? franchiseeId
        : Number(fallback.franchiseId) || null,

    parentFranchiseeId: Number(readValue("#BaseFranchiseeID")) || null,

    areaId: Number.isFinite(areaId) && areaId > 0 ? areaId : null,

    name: cleanText($("#Name").attr("value")),

    consumerId:
      cleanText($("#CustomNo").attr("value")) ||
      String(fallback.consumerId || "")
        .trim()
        .toUpperCase(),

    mobile: cleanText($("#Mobile1").attr("value")),

    active: String(readValue("#IsActive")).toLowerCase() === "true",

    prepaid: String(readValue("#IsPrepaidCustomer")).toLowerCase() === "true",

    address1: readValue("#Address1"),
    address2: readValue("#Address2"),
    address3: readValue("#Address3"),

    postCode: readValue("#PostCode"),

    lastPackageDate: parseDateDDMMYYYY(readValue("#LastPackageDate")),

    createDate: parseDateDDMMYYYY(readValue("#CreateDate")),
  };
};
const getLiveSubscriber = async (consumerId, options = {}) => {
  const found = await findPaytvSubscriber(consumerId, options);

  if (!found) {
    return {
      found: false,
      consumerId,
    };
  }

  return getLiveSubscriberByEncodedId(found.encodedId, {
    customerId: found.customerId,
    companyId: found.companyId,
    franchiseId: found.franchiseId,
    areaId: options.areaId || found.areaId || null,
    consumerId,
  });
};

/* =========================================================
   LIVE ADDRESS / AREA
========================================================= */

const getLiveSubscriberAddress = async (customerId) => {
  const encodedId = encodePaytvId(customerId);

  const response = await requestWithSession((client) =>
    client.get(`/ManageSubscriber/EditAddress/${encodedId}`),
  );

  const $ = cheerio.load(
    typeof response.data === "string" ? response.data : "",
  );

  const country = parseSelectedOption($, "#CountryID");
  const state = parseSelectedOption($, "#StateID");
  const zone = parseSelectedOption($, "#ZoneID");
  const city = parseSelectedOption($, "#CityID");
  const area = parseSelectedOption($, "#AreaID");

  return {
    customerId,

    address1:
      cleanText($("#Address1").attr("value")) ||
      cleanText($("#oldAddress1").attr("value")),

    address2: cleanText($("#Address2").attr("value")),

    address3: cleanText($("#Address3").attr("value")),

    country,

    state,

    zone,

    city,

    area,

    postCode: cleanText($("#PostCode").attr("value")),

    location: cleanText($("#Location").attr("value")),

    road: cleanText($("#Road").attr("value")),

    building: cleanText($("#Buildings").attr("value")),

    wing: cleanText($("#Wing").attr("value")),

    floor: cleanText($("#Floor").attr("value")),

    flatNo: cleanText($("#FlatNo").attr("value")),
  };
};

/* =========================================================
   LIVE HARDWARE + PACKAGES
========================================================= */

const getLiveHardware = async (customerId, options = {}) => {
  if (!customerId) {
    return {
      found: false,
      customerId: null,
      hardwareId: null,
      stbNo: "",
      vcNo: "",
      basicPackage: null,
      addons: [],
      packages: [],
      fetchedAt: new Date(),
    };
  }

  // =========================================================
  // 1. MANAGE HARDWARE PAGE
  // =========================================================

  const encodedCustomerId = options?.encodedId || encodePaytvId(customerId);

  const hardwarePageUrl = `/ManageSubscriber/ManageHadware/${encodedCustomerId}`;

  console.log(`📺 LIVE ManageHardware URL: ${hardwarePageUrl}`);

  const hardwareResponse = await requestWithSession((client) =>
    client.get(hardwarePageUrl, {
      timeout: 60000,
    }),
  );

  const hardwareHtml =
    typeof hardwareResponse.data === "string" ? hardwareResponse.data : "";

  const $hardware = cheerio.load(hardwareHtml);

  console.log("📺 MANAGE HARDWARE DEBUG:", {
    status: hardwareResponse.status,
    htmlLength: hardwareHtml.length,
    title: cleanText($hardware("title").text()),
  });

  // =========================================================
  // 2. STB / VC
  // =========================================================

  let stbNo = "";
  let vcNo = "";

  const firstHardwareRow = $hardware("#orderDetail tr").first();

  if (firstHardwareRow.length) {
    const tds = firstHardwareRow.find("td");

    if (tds.length >= 5) {
      stbNo = cleanText($hardware(tds[3]).text());

      vcNo = cleanText($hardware(tds[4]).text());
    }
  }

  console.log("📺 LIVE STB/VC:", {
    stbNo,
    vcNo,
  });

  // =========================================================
  // 3. ACTIVE HARDWARE LINK
  // =========================================================

  let activeHardwareUrl = "";

  const activeHref =
    $hardware('a[href*="/HardwareService/Active/"]').first().attr("href") || "";

  if (activeHref) {
    activeHardwareUrl = activeHref;
  }

  console.log("📺 ACTIVE HARDWARE HREF:", activeHardwareUrl || "NOT FOUND");

  // =========================================================
  // 4. HARDWARE ID
  // =========================================================

  let hardwareId = null;

  if (activeHardwareUrl) {
    const idMatch = activeHardwareUrl.match(
      /\/HardwareService\/Active\/([^?]+)/i,
    );

    if (idMatch?.[1]) {
      try {
        const decoded = Buffer.from(idMatch[1], "base64").toString("utf8");

        const parsed = Number(decoded);

        if (Number.isFinite(parsed) && parsed > 0) {
          hardwareId = parsed;
        }
      } catch (error) {
        console.warn("📺 Hardware ID decode failed:", error.message);
      }
    }
  }

  console.log("📺 FINAL HARDWARE ID:", hardwareId);

  // =========================================================
  // PACKAGE VARIABLES — DECLARE ONLY ONCE
  // =========================================================
  let basicPackage = null;
  let addons = [];
  let packages = [];

  let billablePackages = [];
  let billableBasicPackage = null;
  let billableAddons = [];

  // =========================================================
  // ACTIVE HARDWARE PAGE
  // =========================================================
  if (activeHardwareUrl) {
    try {
      const activeResponse = await requestWithSession((client) =>
        client.get(activeHardwareUrl, {
          timeout: 60000,
        }),
      );

      const activeHtml =
        typeof activeResponse.data === "string" ? activeResponse.data : "";

      const $active = cheerio.load(activeHtml);

      console.log("📺 ACTIVE HARDWARE DEBUG:", {
        status: activeResponse.status,
        htmlLength: activeHtml.length,
        title: cleanText($active("title").text()),
        hasTbbody: $active("#tbbody").length > 0,
        packageRows: $active("#tbbody tr").length,
        hasPackageName: activeHtml.includes("CCN"),
      });

      $active("#tbbody tr").each((_, row) => {
        const $row = $active(row);

        const className = cleanText($row.attr("class")).toLowerCase();

        const hiddenPackType = cleanText(
          $row.find('input[id*="__PackType"]').first().attr("value"),
        );

        const packType =
          hiddenPackType ||
          (className.includes("basic")
            ? "Basic"
            : className.includes("addon")
              ? "Addon"
              : "");

        const isPackageValue = cleanText(
          $row.find('input[id*="__IsPackage"]').first().attr("value"),
        ).toLowerCase();

        const type =
          isPackageValue === "true"
            ? "Package"
            : isPackageValue === "false"
              ? "Channel"
              : "Package";

        const name =
          cleanText($row.find('input[id*="__Name"]').first().attr("value")) ||
          cleanText($row.find("td").eq(1).text());

        if (!name) {
          return;
        }

        const priceRaw = cleanText(
          $row.find('input[id*="__Price"]').first().attr("value"),
        );

        const custPackIdRaw = cleanText(
          $row.find('input[id*="__CustPackID"]').first().attr("value"),
        );

        const packStartRaw = cleanText(
          $row.find('input[id*="__PackStartDate"]').first().attr("value"),
        );

        const channelCountRaw = cleanText(
          $row.find('input[id*="__PackChannelCount"]').first().attr("value"),
        );

        const rowText = cleanText($row.find("td").eq(1).text());

        const rangeMatch = rowText.match(
          /(\d{1,2}\/\d{1,2}\/\d{4})\s+to\s+(\d{1,2}\/\d{1,2}\/\d{4})/i,
        );

        const startDate =
          (rangeMatch ? parseDateDDMMYYYY(rangeMatch[1]) : null) ||
          parseDateDDMMYYYY(packStartRaw);

        const expiryDate = rangeMatch ? parseDateDDMMYYYY(rangeMatch[2]) : null;

        const price = parseNumber(priceRaw);
        const channelCount = Number(channelCountRaw);

        const plan = cleanText($row.find("td").eq(4).text());

        packages.push({
          name: name.trim(),
          type,
          packType,
          startDate,
          endDate: expiryDate,
          plan,
          price: Number.isFinite(price) ? price : 0,
          channelCount: Number.isFinite(channelCount) ? channelCount : 0,
          custPackId: Number(custPackIdRaw) || null,
        });
      });

      // =====================================================
      // CURRENT BASIC
      // =====================================================
      const basicPackages = packages.filter(
        (p) => String(p.packType || "").toLowerCase() === "basic",
      );

      const now = new Date();

      const currentBasic =
        basicPackages.find((p) => {
          const startOK = !p.startDate || new Date(p.startDate) <= now;

          const endOK = !p.endDate || new Date(p.endDate) >= now;

          return startOK && endOK;
        }) ||
        basicPackages[0] ||
        null;

      basicPackage = currentBasic;

      addons = packages.filter(
        (p) => String(p.packType || "").toLowerCase() === "addon",
      );

      console.log("✅ LIVE ACTIVE PACKAGE RESULT:", {
        hardwareId,
        stbNo,
        vcNo,
        basicPackage,
        addonCount: addons.length,
        totalPackages: packages.length,
      });
    } catch (error) {
      console.error("📺 Live active hardware fetch failed:", error.message);
    }
  }

  // =========================================================
  // AUTHORITATIVE BILLABLE PACKAGES
  // =========================================================
  try {
    const billable = await getLiveBillablePackages(hardwareId, basicPackage);

    if (
      billable &&
      Array.isArray(billable.packages) &&
      billable.packages.length > 0
    ) {
      billablePackages = billable.packages;

      billableBasicPackage = billable.basicPackage || basicPackage;

      billableAddons = Array.isArray(billable.addons) ? billable.addons : [];
    } else {
      // Fallback
      billablePackages = packages;
      billableBasicPackage = basicPackage;
      billableAddons = addons;
    }
  } catch (error) {
    console.error("📺 Billable package fetch failed:", error.message);

    // Fallback
    billablePackages = packages;
    billableBasicPackage = basicPackage;
    billableAddons = addons;
  }

  // =========================================================
  // FINAL DEBUG
  // =========================================================
  console.log("📺 FINAL PARSED HARDWARE:", {
    hardwareId,
    stbNo,
    vcNo,
    basicPackage: billableBasicPackage,
    addonCount: billableAddons.length,
    totalPackages: billablePackages.length,
  });

  return {
    found: true,
    customerId,
    hardwareUrl: hardwarePageUrl,
    hardwareId,
    stbNo,
    vcNo,
    closing: cleanText($hardware("#spanClosing").text()),
    prepaid:
      String(
        $hardware("#IsPrepaidCustomer").attr("value") || "",
      ).toLowerCase() === "true",
    casProvider: "",
    basicPackage: billableBasicPackage,
    addons: billableAddons,
    packages: billablePackages,
    fetchedAt: new Date(),
  };
};
const getLiveBillablePackages = async (hardwareId, fallbackBasic = null) => {
  if (!hardwareId) {
    return {
      packages: fallbackBasic ? [fallbackBasic] : [],
      basicPackage: fallbackBasic || null,
      addons: [],
    };
  }

  const encodedHardwareId = encodePaytvId(hardwareId);

  const url = `/ManageSubscriber/ViewHardwarePackage/${encodedHardwareId}`;

  const response = await requestWithSession((client) =>
    client.get(url, {
      timeout: 60000,
      headers: {
        "X-Requested-With": "XMLHttpRequest",
        Accept: "text/html, */*",
      },
    }),
  );

  const html = typeof response.data === "string" ? response.data : "";

  const $bill = cheerio.load(html);

  const rows = [];

  $bill("table tbody tr").each((_, row) => {
    const $row = $bill(row);

    const cells = $row
      .find("td")
      .map(function () {
        return cleanText($bill(this).text());
      })
      .get();

    if (cells.length < 5) {
      return;
    }

    const name = cells[0] || "";
    const type = cells[1] || "";
    const amount = parseNumber(cells[2]);

    const startDate = parseDateDDMMYYYY(cells[3]);

    const endDate = parseDateDDMMYYYY(cells[4]);

    if (!name) {
      return;
    }

    if (name.toLowerCase() === "name" || name.toLowerCase() === "total") {
      return;
    }

    rows.push({
      name,
      type: String(type || "Package").trim(),

      // Popup ki first row = Base Package
      // baaki current billed addons
      packType: rows.length === 0 ? "Basic" : "Addon",

      startDate,
      endDate,

      plan: "",

      price: Number.isFinite(amount) ? amount : 0,

      channelCount: 0,

      custPackId: null,
    });
  });

  const basicPackage =
    rows.find((item) => String(item.packType).toLowerCase() === "basic") ||
    fallbackBasic ||
    null;

  const addons = rows.filter(
    (item) => String(item.packType).toLowerCase() === "addon",
  );

  console.log("✅ LIVE BILLABLE PACKAGES:", {
  hardwareId,

  total: rows.length,

  basic: basicPackage
    ? {
        name: basicPackage.name,
        type: basicPackage.type,
        packType: basicPackage.packType,
        startDate: basicPackage.startDate,
        endDate: basicPackage.endDate,
        price: basicPackage.price,
      }
    : null,

  addons: addons.map((x) => ({
    name: x.name,
    type: x.type,
    packType: x.packType,
    startDate: x.startDate,
    endDate: x.endDate,
    price: x.price,
  })),

  allBillablePackages: rows.map((x) => ({
    name: x.name,
    type: x.type,
    packType: x.packType,
    startDate: x.startDate,
    endDate: x.endDate,
    price: x.price,
  })),
});

  return {
    packages: rows,
    basicPackage,
    addons,
  };
};
const getLiveActivePackage = async (hardwareId) => {
  if (!hardwareId) {
    return {
      found: false,
      packageName: "",
      packageType: "",
      amount: null,
      startDate: null,
      expiryDate: null,
    };
  }

  const encodedHardwareId = encodePaytvId(hardwareId);

  const response = await requestWithSession((client) =>
    client.get(`/ManageSubscriber/ViewHardwarePackage/${encodedHardwareId}`, {
      timeout: 60000,
    }),
  );

  const html = typeof response.data === "string" ? response.data : "";

  console.log("📺 ACTIVE PACKAGE DEBUG:", {
    status: response.status,
    htmlLength: html.length,
  });

  const $ = cheerio.load(html);

  console.log("📺 ACTIVE PACKAGE TEXT:", cleanText($("body").text()));

  return {
    found: html.includes("CCN") || html.includes("Package"),
    rawHtml: html,
  };
};
const getLiveHardwareFromReport = async ({
  companyId = Number(process.env.PAYTV_COMPANY_ID || 1),

  franchiseId,

  areaId = null,

  consumerId,
}) => {
  if (!franchiseId) {
    throw new Error("PayTV Franchisee ID required for hardware report.");
  }

  if (!consumerId) {
    throw new Error("Consumer ID required for hardware report.");
  }

  console.log("📺 LIVE hardware report context:", {
    companyId,
    franchiseId,
    areaId,
    consumerId,
  });

  const buffer = await fetchCustomerWiseHardwareReport({
    companyId,
    franchiseId,
    areaId,
  });

  const rows = parseExcelBuffer(buffer);

  console.log(`📺 LIVE hardware report rows: ${rows.length}`);

  const wantedId = String(consumerId).trim().toUpperCase();

  const row = rows.find((item) => {
    const id = toIdString(getField(item, "Sub.No.", "Sub. No.", "SubNo"))
      .trim()
      .toUpperCase();

    return id === wantedId;
  });

  if (!row) {
    console.log(`📺 No hardware row found for ${wantedId}`);

    return {
      found: false,
      consumerId,
      stbNo: "",
      vcNo: "",
      type: "",
      mobile: "",
      closing: "",
      active: "",
      installationInfo: "",
      raw: null,
      fetchedAt: new Date(),
    };
  }

  const result = {
    found: true,

    consumerId,

    stbNo: toIdString(getField(row, "STB No.", "STB No", "STBNo")).trim(),

    vcNo: toIdString(getField(row, "VC No.", "VC No", "VCNo")).trim(),

    type: String(getField(row, "Type") || "").trim(),

    mobile: toIdString(getField(row, "Mobile")).trim(),

    closing: String(getField(row, "Closing") || "").trim(),

    active: String(getField(row, "Active") || "").trim(),

    installationInfo: String(
      getField(row, "Instal. Dt. & Address") || "",
    ).trim(),

    raw: row,

    fetchedAt: new Date(),
  };

  console.log("✅ LIVE HARDWARE REPORT RESULT:", {
    consumerId,
    stbNo: result.stbNo,
    vcNo: result.vcNo,
    type: result.type,
  });

  return result;
};
const getLiveExpiryFromReport = async ({
  companyId = Number(process.env.PAYTV_COMPANY_ID || 1),

  franchiseId,

  consumerId,

  expDays = 3650,
}) => {
  if (!franchiseId) {
    throw new Error("PayTV Franchisee ID required for expiry report.");
  }

  const client = await loginToPaytv();

  const form = new URLSearchParams();

  form.append("CompanyID", String(companyId));

  form.append("FranchiseID", String(franchiseId));

  form.append("rptType", "ExcelNoFormate");

  form.append("ExpDays", String(expDays));

  const response = await client.post(
    "/UserLogin",
    new URLSearchParams({
      username,
      password,
      type: "User",
    }),
    {
      timeout: 60000,
      maxRedirects: 0,
      validateStatus: (status) => status >= 200 && status < 400,
    },
  );

  const result = String(response.data || "").trim();

  console.log("📺 LIVE expiry report generate:", result);

  if (result !== "Sucess" && result !== "SucessViewer") {
    throw new Error(`Expiry report generate nahi hua: ${result.slice(0, 300)}`);
  }

  const fileResponse = await client.get("/SendReportFiles/Showrpt/", {
    responseType: "arraybuffer",
    timeout: 60000,
  });
  console.log("📺 PayTV LOGIN RESPONSE:", {
    status: response.status,
    location: response.headers?.location || "",
  });
  if (
    response.status >= 300 &&
    response.status < 400 &&
    response.headers?.location
  ) {
    const redirectUrl = response.headers.location;

    const redirectResponse = await client.get(redirectUrl, {
      timeout: 60000,
      maxRedirects: 0,
      validateStatus: (status) => status >= 200 && status < 400,
    });

    console.log("📺 PAYTV REDIRECT RESPONSE:", {
      status: redirectResponse.status,
      url: redirectUrl,
    });
  }
  const buffer = Buffer.from(fileResponse.data);

  const rows = parseExcelBuffer(buffer);

  const wantedId = String(consumerId || "")
    .trim()
    .toUpperCase();

  const matches = rows.filter((row) => {
    const id = toIdString(getField(row, "Sub.No.", "Sub. No.", "SubNo"))
      .trim()
      .toUpperCase();

    return id === wantedId;
  });

  if (!matches.length) {
    console.log(`📺 No expiry/package row found for ${wantedId}`);

    return {
      found: false,
      consumerId,
      packageName: "",
      packageType: "",
      startDate: null,
      expiryDate: null,
      raw: null,
      fetchedAt: new Date(),
    };
  }

  // Most relevant/latest expiry first
  matches.sort((a, b) => {
    const da =
      new Date(getField(a, "ToDate", "Expiry", "ExpiryDate")).getTime() || 0;

    const db =
      new Date(getField(b, "ToDate", "Expiry", "ExpiryDate")).getTime() || 0;

    return db - da;
  });

  const row = matches[0];

  const parseMaybeDate = (value) => {
    if (!value) return null;

    const parsed = parseDateDDMMYYYY(String(value).trim());

    if (parsed) return parsed;

    const date = new Date(value);

    return Number.isNaN(date.getTime()) ? null : date;
  };

  const packageName = String(
    getField(row, "Name", "Package", "PackageName") || "",
  ).trim();

  const packageType = String(getField(row, "Type", "PackageType") || "").trim();

  const startDate = parseMaybeDate(
    getField(row, "FromDate", "StartDate", "PackageStartDate"),
  );

  const expiryDate = parseMaybeDate(
    getField(row, "ToDate", "Expiry", "ExpiryDate"),
  );

  const resultData = {
    found: true,

    consumerId,

    packageName,

    packageType,

    startDate,

    expiryDate,

    raw: row,

    fetchedAt: new Date(),
  };

  console.log("✅ LIVE EXPIRY RESULT:", {
    consumerId,
    packageName,
    packageType,
    startDate,
    expiryDate,
  });

  return resultData;
};
/* =========================================================
   LIVE BILL
   Current month's PayTV BillRegister
========================================================= */

const getLiveBill = async (
  customerId,
  consumerId,
  {
    fromDate,
    toDate,
    companyId = Number(process.env.PAYTV_COMPANY_ID || 1),
    franchiseId = Number(process.env.PAYTV_FRANCHISEE_ID || 10027),
  } = {},
) => {
  const now = new Date();

  const formatDate = (date) => {
    const d = new Date(date);

    const dd = String(d.getDate()).padStart(2, "0");

    const mm = String(d.getMonth() + 1).padStart(2, "0");

    const yyyy = d.getFullYear();

    return `${dd}/${mm}/${yyyy}`;
  };

  const start = fromDate || new Date(now.getFullYear(), now.getMonth(), 1);

  const end = toDate || now;

  const response = await requestWithSession((client) =>
    client.post(
      "/Bills",
      new URLSearchParams({
        CompanyID: String(companyId),
        FranchiseeID: String(franchiseId),

        FromBillNo: "",
        ToBillNo: "",

        TypeID: "-1",

        FromBillDate: formatDate(start),
        ToBillDate: formatDate(end),

        CustomerName: String(consumerId || "").trim(),

        CustomerID: String(customerId || ""),

        ShowZeroBillAmount: "",
        ShowCustomersEmail: "",

        action: "Index",
      }),
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
      },
    ),
  );

  const $ = cheerio.load(
    typeof response.data === "string" ? response.data : "",
  );

  const bills = [];

  $("table tbody tr").each((index, row) => {
    const cells = $(row)
      .find("td")
      .map(function () {
        return cleanText($(this).text());
      })
      .get();

    /*
      Expected PayTV columns:

      0 checkbox
      1 Bill No
      2 Date
      3 Due
      4 Name + Subscriber ID
      5 Customer Type
      6 Product Amount
      7 Rent Amount
      8 Discount
      9 Tax
      10 Amount
    */

    if (cells.length < 11) return;

    const subscriberText = cells[4];

    if (
      consumerId &&
      !subscriberText.toUpperCase().includes(String(consumerId).toUpperCase())
    ) {
      return;
    }

    bills.push({
      billNo: cells[1] || "",
      billDate: parseDateDDMMYYYY(cells[2]),
      dueDate: parseDateDDMMYYYY(cells[3]),

      subscriber: subscriberText,

      customerType: cells[5] || "",

      productAmount: parseNumber(cells[6]),

      rentAmount: parseNumber(cells[7]),

      discount: parseNumber(cells[8]),

      tax: parseNumber(cells[9]),

      amount: parseNumber(cells[10]),
    });
  });

  /*
   * Latest bill first
   */
  bills.sort((a, b) => {
    const ad = a.billDate?.getTime() || 0;

    const bd = b.billDate?.getTime() || 0;

    return bd - ad;
  });

  return {
    customerId,
    consumerId,

    found: bills.length > 0,

    current: bills.length > 0 ? bills[0] : null,

    bills,

    fetchedAt: new Date(),
  };
};

/* =========================================================
   FULL LIVE CUSTOMER
========================================================= */

const getLiveSubscriberFull = async (consumerId, options = {}) => {
  const subscriber = await getLiveSubscriber(consumerId, options);

  if (!subscriber?.found) {
    return {
      found: false,
      consumerId,
    };
  }

  const companyId =
    Number(subscriber.companyId) ||
    Number(options.companyId) ||
    Number(process.env.PAYTV_COMPANY_ID || 1);

  const franchiseId =
    Number(subscriber.franchiseId) || Number(options.franchiseId) || null;

  const areaId = Number(subscriber.areaId) || Number(options.areaId) || null;

  const results = await Promise.allSettled([
    // 1. Live address
    getLiveSubscriberAddress(subscriber.customerId),

    // 2. Live STB / VC
    getLiveHardwareFromReport({
      companyId,
      franchiseId,
      areaId,
      consumerId: subscriber.consumerId || consumerId,
    }),

    // 3. Live expiry/package
    getLiveExpiryFromReport({
      companyId,
      franchiseId,
      consumerId: subscriber.consumerId || consumerId,
    }),

    // 4. Live bill
    getLiveBill(subscriber.customerId, subscriber.consumerId, {
      ...options,
      companyId,
      franchiseId,
    }),
  ]);

  const [addressResult, hardwareResult, expiryResult, billResult] = results;

  const hardware =
    hardwareResult.status === "fulfilled"
      ? hardwareResult.value
      : {
          found: false,
          consumerId,
          stbNo: "",
          vcNo: "",
          error: hardwareResult.reason?.message || "Hardware unavailable",
        };

  const expiry =
    expiryResult.status === "fulfilled"
      ? expiryResult.value
      : {
          found: false,
          consumerId,
          packageName: "",
          packageType: "",
          startDate: null,
          expiryDate: null,
          error: expiryResult.reason?.message || "Expiry unavailable",
        };

  return {
    found: true,

    subscriber,

    address:
      addressResult.status === "fulfilled"
        ? addressResult.value
        : {
            customerId: subscriber.customerId,

            error: addressResult.reason?.message || "Address unavailable",
          },

    hardware,

    package: {
      found: expiry.found,

      name: expiry.packageName || "",

      type: expiry.packageType || "",

      startDate: expiry.startDate || null,

      expiryDate: expiry.expiryDate || null,
    },

    expiry,

    bill:
      billResult.status === "fulfilled"
        ? billResult.value
        : {
            customerId: subscriber.customerId,

            consumerId: subscriber.consumerId,

            found: false,

            current: null,

            bills: [],

            error: billResult.reason?.message || "Bill unavailable",
          },

    fetchedAt: new Date(),
  };
};

const fetchExpiryReport = async (expDays = 60) => {
  const client = await loginToPaytv();

  const form = new URLSearchParams();
  form.append("CompanyID", "1");
  form.append("FranchiseID", process.env.PAYTV_FRANCHISE_ID);
  form.append("rptType", "ExcelNoFormate");
  form.append("ExpDays", String(expDays));

  const genRes = await client.post("/FReports/SubPckExpire", form, {
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
  });

  if (!String(genRes.data).includes("Sucess")) {
    throw new Error(
      "Report generate nahi hua, server ne bheja: " +
        String(genRes.data).slice(0, 200),
    );
  }

  const fileRes = await client.get("/SendReportFiles/Showrpt/", {
    responseType: "arraybuffer",
  });
  return Buffer.from(fileRes.data);
};

const toSiteDate = (date) => {
  const d = new Date(date);
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${dd}/${mm}/${d.getFullYear()}`;
};

const fetchBillRegister = async (fromDate, toDate) => {
  const client = await loginToPaytv();

  const from =
    fromDate || new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  const to = toDate || new Date();

  const form = new URLSearchParams();
  form.append("rptType", "ExcelNoFormate");
  form.append("CompanyID", "1");
  form.append("FranchiseID", process.env.PAYTV_FRANCHISE_ID);
  form.append("txtfdate", toSiteDate(from));
  form.append("txttdate", toSiteDate(to));
  form.append("AreaID", "");
  form.append("hdArea", "");
  form.append("CompanyUserID", "");
  form.append("hdUserBy", "");
  form.append("txtfvoucharno", "");
  form.append("txttvoucharno", "");
  form.append("CustomerName", "");
  form.append("CustomerID", "");

  const genRes = await client.post("/FReports/BillRegister", form, {
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
  });

  if (!String(genRes.data).includes("Sucess")) {
    throw new Error(
      "Report generate nahi hua, server ne bheja: " +
        String(genRes.data).slice(0, 200),
    );
  }

  const fileRes = await client.get("/SendReportFiles/Showrpt/", {
    responseType: "arraybuffer",
  });
  return Buffer.from(fileRes.data);
};
const fetchCustomerWiseHardwareReport = async ({
  companyId = Number(process.env.PAYTV_COMPANY_ID || 1),
  franchiseId = Number(
    process.env.PAYTV_FRANCHISE_ID || process.env.PAYTV_FRANCHISEE_ID || 10027,
  ),
  areaId = null,
} = {}) => {
  const client = await loginToPaytv();

  const form = new URLSearchParams();

  form.append("CompanyID", String(companyId));

  // IMPORTANT:
  // Selected local area ke PayTV Franchisee ID ka use hoga
  form.append("FranchiseID", String(franchiseId));

  form.append("rptType", "ExcelNoFormate");

  // Agar specific PayTV Area mapped hai to wahi area
  form.append("AreaID", areaId ? String(areaId) : "");
  form.append("hdArea", areaId ? String(areaId) : "");

  form.append("rptStatus", "-1");

  form.append("CollectionPersonID", "");
  form.append("hdCollectionPersonID", "");

  form.append("rptPending", "0");

  form.append("IsInstallationDate", "0");

  form.append("txtfdate", "");
  form.append("txttdate", "");

  form.append("ItemID", "");
  form.append("ItemType", "");

  console.log("📺 Hardware report context:", {
    companyId,
    franchiseId,
    areaId,
  });

  const generateResponse = await client.post(
    "/FReports/CustomerWiseHardwareInfo",
    form,
    {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      timeout: 60000,
    },
  );

  const result = String(generateResponse.data || "").trim();

  console.log("📺 CustomerWiseHardwareInfo generate:", result);

  if (result !== "Sucess" && result !== "SucessViewer") {
    throw new Error(
      `Hardware report generate nahi hua: ${result.slice(0, 300)}`,
    );
  }

  const fileResponse = await client.get("/SendReportFiles/Showrpt/", {
    responseType: "arraybuffer",
    timeout: 60000,
  });

  const buffer = Buffer.from(fileResponse.data);

  console.log(`📺 CustomerWiseHardwareInfo downloaded: ${buffer.length} bytes`);

  return buffer;
};
// "Manage Subscriber" list ke saare pages parse karta hai. Har row ke saath uska
// encoded ID (EditGeneralInfo link se) bhi nikaal ke deta hai, taaki baad me
// chahe to us subscriber ka Hardware page bhi fetch kar sakein.
const fetchAllSubscribersHtml = async (client) => {
  const allRows = [];

  let page = 1;
  let totalPages = 1;

  do {
    const url =
      page === 1 ? "/ManageSubscriber" : `/ManageSubscriber/Index/${page}`;

    console.log(`📺 Fetching subscriber page ${page}: ${url}`);

    const res = await client.get(url);

    const html = String(res.data || "");

    console.log(
      "📺 ManageSubscriber contains CompanyID:",
      html.includes("CompanyID"),
    );

    console.log(
      "📺 ManageSubscriber contains FranchiseeID:",
      html.includes("FranchiseeID"),
    );

    const $ = cheerio.load(html);

    console.log(
      "📺 CompanyID selected:",
      $("#CompanyID option:selected").attr("value"),
      $("#CompanyID option:selected").text().trim(),
    );

    console.log(
      "📺 FranchiseeID selected:",
      $("#FranchiseeID option:selected").attr("value"),
      $("#FranchiseeID option:selected").text().trim(),
    );

    const pageRowsBefore = allRows.length;

    $("#tblrecores tbody tr").each((_, el) => {
      const tds = $(el).find("td");

      if (tds.length < 8) return;

      const editLink =
        $(el).find('a[href*="/EditGeneralInfo/"]').attr("href") || "";

      const encodedId = editLink.split("/EditGeneralInfo/")[1] || "";

      allRows.push({
        consumerId: $(tds[1]).text().trim(),
        name: $(tds[2]).text().trim(),
        mobile: $(tds[3]).text().trim(),
        type: $(tds[4]).text().trim(),
        area: $(tds[5]).text().trim(),
        activeStatus: $(tds[6]).text().trim(),
        deactiveStatus: $(tds[7]).text().trim(),
        encodedId,
      });
    });

    const pageRows = allRows.length - pageRowsBefore;

    console.log(`📺 Page ${page}: ${pageRows} subscribers found`);

    // Debug actual pagination text
    const pageInfoText = $(".clear span").first().text().trim();

    console.log(`📺 Page ${page} info:`, JSON.stringify(pageInfoText));

    // Try several common formats
    const matches = [
      pageInfoText.match(/of\s+(\d+)\s+from/i),
      pageInfoText.match(/from\s+\d+\s+to\s+\d+\s+of\s+(\d+)/i),
      pageInfoText.match(/of\s+(\d+)/i),
    ].filter(Boolean);

    if (page === 1 && matches.length > 0) {
      const totalRecords = parseInt(matches[0][1], 10);

      if (!Number.isNaN(totalRecords) && totalRecords > 0) {
        // We can estimate pages from first page size
        const pageSize = pageRows || 1;

        totalPages = Math.ceil(totalRecords / pageSize);

        console.log(
          `📺 Total records: ${totalRecords}, page size: ${pageSize}, total pages: ${totalPages}`,
        );
      }
    }

    page++;
  } while (page <= totalPages);

  console.log(`📺 FINAL PayTV subscriber rows: ${allRows.length}`);

  return allRows;
};
const fetchPaytvFranchisees = async () => {
  const response = await requestWithSession((client) =>
    client.get("/MultiFranchise"),
  );

  const $ = cheerio.load(
    typeof response.data === "string" ? response.data : "",
  );

  const franchisees = [];
  const seen = new Set();

  $('a[href*="/MultiFranchise/LoginOn/"]').each((_, el) => {
    const href = cleanText($(el).attr("href"));

    const match = href.match(/\/MultiFranchise\/LoginOn\/([^/?#]+)/i);

    if (!match) {
      return;
    }

    const encodedId = match[1];

    let franchiseId = null;

    try {
      franchiseId = Number(Buffer.from(encodedId, "base64").toString("utf8"));
    } catch {
      franchiseId = null;
    }

    if (
      !Number.isFinite(franchiseId) ||
      franchiseId <= 0 ||
      seen.has(franchiseId)
    ) {
      return;
    }

    const row = $(el).closest("tr");

    const cells = row
      .find("td")
      .map(function () {
        return cleanText($(this).text());
      })
      .get();

    const name = cells[0] || cleanText($(el).parent().text()) || "";

    const code = cells[1] || "";
    const parent = cells[2] || "";
    const franchiseeType = cells[3] || "";

    seen.add(franchiseId);

    franchisees.push({
      id: franchiseId,
      encodedId,
      name,
      code,
      parent,
      franchiseeType,
    });
  });

  console.log(`📺 PayTV Franchisees discovered: ${franchisees.length}`);

  console.table(franchisees);

  if (!franchisees.length) {
    throw new Error("PayTV se Franchisee list nahi mili.");
  }

  return franchisees;
};
// Sirf discovery-loop ke liye — fast aur no-retry, taaki ek slow/dead franchise
// poore scan ko minutes tak latka na de. Normal (cached-franchise) fetch iske
// bajaye purana findPaytvSubscriber (retry-wala) hi use karta hai.
const findPaytvSubscriberFast = async (
  consumerId,
  {
    companyId = Number(process.env.PAYTV_COMPANY_ID || 1),
    franchiseId,
    timeout = 8000,
  } = {},
) => {
  if (!consumerId || !franchiseId) return null;

  try {
    const client = await loginToPaytv();

    const response = await client.get("/Json/GetSubscriberList/", {
      params: {
        clientName: String(consumerId).trim(),
        companyid: companyId,
        franchiseid: franchiseId,
      },
      timeout, // chhota timeout — ek dead franchise poori scan ko block na kare
    });

    const data = Array.isArray(response.data) ? response.data : [];
    const exact = data.find((item) =>
      cleanText(item?.Text)
        .toUpperCase()
        .includes(String(consumerId).trim().toUpperCase()),
    );
    const item = exact || data[0];
    if (!item) return null;

    const customerId = Number(item.Value);
    if (!Number.isFinite(customerId) || customerId <= 0) return null;

    return {
      customerId,
      displayText: cleanText(item.Text),
      encodedId: encodePaytvId(customerId),
      companyId,
      franchiseId,
    };
  } catch (error) {
    // Timeout ya koi bhi error — bas is franchise ko skip karo, retry mat karo
    return null;
  }
};
const findPaytvSubscriberAcrossFranchisees = async (
  consumerId,
  {
    companyId = Number(process.env.PAYTV_COMPANY_ID || 1),
    preferredFranchiseId = null,
  } = {},
) => {
  if (!consumerId) {
    throw new Error("Consumer ID required.");
  }

  const franchisees = await fetchPaytvFranchisees();

  const ordered = [...franchisees];

  // Preferred franchise pehle check karo
  if (preferredFranchiseId) {
    ordered.sort((a, b) => {
      if (a.id === Number(preferredFranchiseId)) return -1;
      if (b.id === Number(preferredFranchiseId)) return 1;
      return 0;
    });
  }

  const unique = [];
  const seen = new Set();

  for (const franchisee of ordered) {
    if (!seen.has(franchisee.id)) {
      seen.add(franchisee.id);
      unique.push(franchisee);
    }
  }

  console.log(
    `📺 Searching ${consumerId} across ${unique.length} PayTV franchisees...`,
  );

  for (const franchisee of unique) {
    try {
      const found = await findPaytvSubscriberFast(consumerId, {
        companyId,
        franchiseId: franchisee.id,
      });

      if (found) {
        console.log(`✅ PayTV customer found: ${consumerId}`, {
          franchiseId: found.franchiseId,
          customerId: found.customerId,
          franchiseeName: franchisee.name,
        });

        return {
          ...found,
          franchiseeName: franchisee.name,
        };
      }
    } catch (error) {
      console.log(
        `📺 Franchisee ${franchisee.id} search failed: ${error.message}`,
      );
    }
  }

  return null;
};
const getLiveSubscriberAcrossFranchisees = async (consumerId, options = {}) => {
  const found = await findPaytvSubscriberAcrossFranchisees(consumerId, {
    companyId:
      Number(options.companyId) || Number(process.env.PAYTV_COMPANY_ID || 1),

    preferredFranchiseId: Number(options.franchiseId) || null,
  });

  if (!found) {
    return {
      found: false,
      consumerId,
    };
  }

  return getLiveSubscriberByEncodedId(found.encodedId, {
    customerId: found.customerId,
    companyId: found.companyId,
    franchiseId: found.franchiseId,
    consumerId,
  });
};
// Ek subscriber ke Hardware page se STB No aur VC No nikalta hai
// (encodedId woh hai jo fetchAllSubscribersHtml se mila tha)
const fetchSubscriberHardware = async (client, encodedId) => {
  const res = await client.get(`/ManageSubscriber/ManageHadware/${encodedId}`);
  const $ = cheerio.load(res.data);

  const firstRow = $("#orderDetail tr").first();
  if (!firstRow.length) return { stbNo: "", vcNo: "" };

  const tds = firstRow.find("td");
  return {
    stbNo: $(tds[3]).text().trim(),
    vcNo: $(tds[4]).text().trim(),
  };
};

module.exports = {
  // existing
  loginToPaytv,
  createClient,

  fetchExpiryReport,
  fetchBillRegister,
  fetchCustomerWiseHardwareReport,
  fetchAllSubscribersHtml,
  fetchSubscriberHardware,
  fetchPaytvFranchisees,
  resetPaytvSession,

  findPaytvSubscriber,
  getLiveSubscriber,
  getLiveSubscriberAddress,
  getLiveSubscriberAcrossFranchisees,

  getLiveHardware,
  getLiveHardwareFromReport,
  getLiveExpiryFromReport,
  getLiveActivePackage,
  switchPaytvFranchise,
  getLiveBill,
  getLiveSubscriberFull,
  getLiveSubscriberByEncodedId,

  // ...
};
