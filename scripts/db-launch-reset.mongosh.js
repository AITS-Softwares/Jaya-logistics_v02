// Follow README_DB_LAUNCH_RESET.md for backup, verification and execution.
// Loading this file does not delete data.
var backupsVerified = false;

function runReset(databaseName, execute = false, confirmName = "") {
  if (typeof execute !== "boolean") {
    throw new Error("execute must be true or false.");
  }

  // Retained MongoDB backup databases are deliberately excluded.
  if (
    databaseName !== "jaya" &&
    !/^jaya_reset_test_[0-9]{8}-[0-9]{6}$/.test(databaseName)
  ) {
    throw new Error("Database name is outside this reset procedure.");
  }

  if (!db.getMongo().getDBNames().includes(databaseName)) {
    throw new Error("Database not found: " + databaseName);
  }

  if (execute && confirmName !== databaseName) {
    throw new Error("Confirmation does not match. Nothing deleted.");
  }

  if (execute && !backupsVerified) {
    throw new Error("Verify the local and MongoDB backups before deleting.");
  }

  const rdb = db.getSiblingDB(databaseName);

  const fullyEmptied = [
    // Order-to-Billing workflow
    "orderpanels",
    "purchasepanels",
    "vehiclenegotiations",
    "advancepayments",
    "pricingpanels",
    "loadingpanels",
    "consignmentnotes",
    "pods",
    "balancepayments",
    "savedreports",

    // Selected masters and dependent rate history (all companies)
    "ratehistories",
    "ratemasters",
    "locations",
    "vehicles",
    "owners",

    // Driver identities, registrations and mobile login sessions
    "drivermobilesessions",
    "driverdevices",
    "driverprofiles",

    // Linked trip and tracking history
    "drivertrips",
    "trackingsessions",
    "locationpoints",
    "tripevents",
    "stopepisodes",
    "mobileoperationalalerts",

    // Nine legacy workflow counter collections
    "orderpanelcounters",
    "purchasecounters",
    "vehiclenegotiationcounters",
    "advancepaymentcounters",
    "pricingcounters",
    "loadingcounters",
    "consignmentcounters",
    "podcounters",
    "balancepaymentcounters"
  ];

  const targets = fullyEmptied.map(name => ({
    name: name,
    filter: {}
  }));

  // The inbox is shared with projects, helpdesk and other ERP modules.
  // Match explicit source/module metadata or known logistics URLs/types only.
  const notificationFilter = {
    $or: [
      { sourceModel: { $in: [
        "OrderPanel", "PurchasePanel", "VehicleNegotiation", "AdvancePayment",
        "PricingPanel", "LoadingPanel", "ConsignmentNote", "POD", "BalancePayment",
        "SavedReport", "RateMaster", "RateHistory", "Location", "Vehicle", "Owner",
        "DriverProfile", "DriverDevice", "DriverMobileSession", "DriverTrip",
        "TrackingSession", "LocationPoint", "TripEvent", "StopEpisode", "MobileOperationalAlert"
      ] } },
      { moduleName: { $in: [
        "Order Panel", "Purchase Panel", "Vehicle Negotiation", "Advance Payment",
        "Pricing Panel", "Pricing Panel - Part 2 Approval", "Loading Info",
        "Consignment Note", "Proof Of Delivery", "Balance-Payment", "Billing",
        "Rate Master"
      ] } },
      { type: /^(?:order-|pricing-|vnn-replacement-needed$|billing-reminder$)/ },
      { url: /^\/admin\/(?:order-panel|purchase-panel|vehicle-negotiation|advance-payment|pricing-panel|loading-info|consignment-note|proofofdelivery|balance-payment|billing|rate-master|locations|vehicles|owners|driver-mobile)(?:[/?#]|$)/i }
    ]
  };

  targets.push(
    { name: "notifications", filter: notificationFilter },
    {
      name: "reapprovalaudits",
      filter: {
        panel: {
          $in: [
            "order", "purchase", "vnn", "advance", "pricing",
            "loading", "lr", "pod", "balance"
          ]
        }
      }
    },
    {
      name: "documentsequences",
      filter: {
        documentType: {
          $in: [
            "OP", "ORD", "PUR", "VNN", "ADV",
            "PRC", "LD", "LR", "POD", "BLP"
          ]
        }
      }
    },
    {
      name: "counters",
      filter: {
        id: /^Billing-/
      }
    }
  );

  const existing = rdb.getCollectionNames();

  print("DATABASE: " + databaseName);
  print("MODE: " + (execute ? "DELETE" : "PREVIEW ONLY"));

  if (!execute) {
    print("ACTUAL COLLECTIONS:");
    printjson(existing.slice().sort());
  }

  // Read all counts before starting any deletion.
  for (const target of targets) {
    if (!existing.includes(target.name)) {
      print(target.name + ": ABSENT — verify this is expected");
      continue;
    }

    const count = rdb
      .getCollection(target.name)
      .countDocuments(target.filter);

    print(target.name + ": " + count + " selected");
  }

  if (!execute) {
    print("PREVIEW COMPLETE — nothing deleted.");
    return;
  }

  for (const target of targets) {
    if (!existing.includes(target.name)) {
      print(target.name + ": skipped; collection absent");
      continue;
    }

    const result = rdb
      .getCollection(target.name)
      .deleteMany(target.filter);

    print(target.name + ": deleted " + result.deletedCount);
  }

  for (const target of targets) {
    if (!existing.includes(target.name)) {
      continue;
    }

    const remaining = rdb
      .getCollection(target.name)
      .countDocuments(target.filter);

    print(target.name + ": remaining " + remaining);

    if (remaining !== 0) {
      throw new Error("Reset incomplete for " + target.name);
    }
  }

  print("RESET COMPLETE.");
}
