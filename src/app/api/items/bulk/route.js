import { NextResponse } from "next/server";
import dbConnect from "@/lib/db.js";
import Item from "@/models/ItemModels";
import Customer from "@/models/CustomerModel";
import ItemGroup from "@/models/ItemGroupModels";
import { validateMasterDataRequest } from "@/lib/masterDataPermission";

const ITEM_TYPES = new Map([
  ["product", "Product"],
  ["service", "Service"],
  ["raw material", "Raw Material"],
]);
const UOMS = new Map([
  ["kilogram (kg)", "KG"], ["kg", "KG"],
  ["metric ton (mtp)", "MTP"], ["mtp", "MTP"],
  ["piece (pc)", "PC"], ["pc", "PC"],
  ["liter (ltr)", "LTR"], ["ltr", "LTR"],
  ["meter (mtr)", "MTR"], ["mtr", "MTR"],
]);

const normalizeKey = (value) => String(value || "").toLowerCase().replace(/[^a-z0-9]/g, "");
const normalizeValue = (value) => String(value ?? "").trim();

function readField(row, ...aliases) {
  const keys = new Map(Object.entries(row || {}).map(([key, value]) => [normalizeKey(key), value]));
  for (const alias of aliases) {
    const value = keys.get(normalizeKey(alias));
    if (value !== undefined) return normalizeValue(value);
  }
  return "";
}

function resolveCustomer(value, customers) {
  const normalized = value.trim().toLocaleLowerCase();
  const displayMatch = value.match(/^(.*?)\s*\(([^()]*)\)\s*$/);
  const codeFromDisplay = displayMatch?.[2]?.trim().toLocaleLowerCase();
  const byCode = customers.filter((customer) => String(customer.customerCode || "").trim().toLocaleLowerCase() === normalized
    || (codeFromDisplay && String(customer.customerCode || "").trim().toLocaleLowerCase() === codeFromDisplay));
  if (byCode.length === 1) {
    if (displayMatch && displayMatch[1].trim().toLocaleLowerCase() !== String(byCode[0].customerName || "").trim().toLocaleLowerCase()) {
      return { error: `Customer value '${value}' has a code that does not match its name` };
    }
    return { customer: byCode[0] };
  }
  if (byCode.length > 1) return { error: `Customer code '${value}' is ambiguous` };
  const name = displayMatch ? displayMatch[1].trim() : value;
  const byName = customers.filter((customer) => String(customer.customerName || "").trim().toLocaleLowerCase() === name.toLocaleLowerCase());
  if (byName.length === 1) return { customer: byName[0] };
  if (byName.length > 1) return { error: `Customer name '${name}' is ambiguous; use the dropdown value including its customer code` };
  return { error: `Customer '${value}' was not found in Customer Management` };
}

export async function POST(req) {
  await dbConnect();
  try {
    const { user, error, status } = await validateMasterDataRequest(req, "view", "Items");
    if (error) return NextResponse.json({ success: false, message: error }, { status });
    const companyId = user.companyId;
    const createdBy = user.id;
    const { items } = await req.json();
    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ success: false, message: "Invalid or empty items array" }, { status: 400 });
    }

    const [customers, itemGroups, lastItem] = await Promise.all([
      Customer.find({ companyId }).select("customerName customerCode").lean(),
      ItemGroup.find({ companyId }).select("name subgroups").lean(),
      Item.findOne({ companyId }).sort({ createdAt: -1 }).select("itemCode").lean(),
    ]);
    let nextCodeNumber = lastItem ? parseInt(String(lastItem.itemCode || "").split("-")[1] || "0", 10) + 1 : 1;
    const results = [];
    let createdCount = 0;
    let updatedCount = 0;
    let skippedCount = 0;
    const permissionCache = new Map();

    for (let index = 0; index < items.length; index++) {
      const row = items[index];
      const itemName = readField(row, "Item Name", "itemName");
      const groupName = readField(row, "Item Group", "category", "group");
      const subgroupName = readField(row, "Subgroup", "subgroup");
      const customerValue = readField(row, "Customer", "customer", "customerCode", "customerName");
      const hsnCode = readField(row, "HSN/SAC", "HSN SAC", "gstCode", "hsnCode");
      const itemType = readField(row, "Item Type", "itemType");
      const uomValue = readField(row, "Unit Of Measure", "Unit of Measure", "uom", "unitOfMeasure");
      const description = readField(row, "Description", "description");
      const errors = [];

      if (!groupName) errors.push("Item Group is required");
      if (!customerValue) errors.push("Customer is required");
      if (!hsnCode) errors.push("HSN/SAC is required");
      if (!uomValue) errors.push("Unit Of Measure is required");
      const itemGroupMatches = groupName
        ? itemGroups.filter((group) => String(group.name || "").trim().toLocaleLowerCase() === groupName.toLocaleLowerCase())
        : [];
      if (groupName && itemGroupMatches.length === 0) errors.push(`Item Group '${groupName}' was not found`);
      if (itemGroupMatches.length > 1) errors.push(`Item Group '${groupName}' is ambiguous`);
      const itemGroup = itemGroupMatches.length === 1 ? itemGroupMatches[0] : null;

      let canonicalSubgroup = "";
      if (subgroupName && itemGroup) {
        const subgroup = (itemGroup.subgroups || []).find((entry) => String(entry).trim().toLocaleLowerCase() === subgroupName.toLocaleLowerCase());
        if (!subgroup) errors.push(`Subgroup '${subgroupName}' does not belong to Item Group '${itemGroup.name}'`);
        else canonicalSubgroup = subgroup;
      }

      const { customer, error: customerError } = customerValue ? resolveCustomer(customerValue, customers) : {};
      if (customerError) errors.push(customerError);
      const normalizedItemType = itemType.toLocaleLowerCase();
      if (itemType && !ITEM_TYPES.has(normalizedItemType)) errors.push(`Item Type '${itemType}' is invalid; use Product, Service, or Raw Material`);
      const uom = UOMS.get(uomValue.toLocaleLowerCase());
      if (uomValue && !uom) errors.push(`Unit Of Measure '${uomValue}' is invalid; choose a value from the template dropdown`);

      if (errors.length) {
        skippedCount++;
        results.push({ row: index + 2, success: false, errors });
        continue;
      }

      const itemData = {
        companyId,
        createdBy,
        customerId: customer._id,
        customerName: customer.customerName,
        customerCode: customer.customerCode || "",
        itemName,
        category: itemGroup.name,
        subgroup: canonicalSubgroup,
        gstCode: hsnCode,
        itemType: ITEM_TYPES.get(normalizedItemType) || "",
        uom,
        description,
      };

      let existingItem = null;
      if (itemName) {
        const escapedName = itemName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        const matchingItems = await Item.find({
          companyId,
          itemName: { $regex: `^${escapedName}$`, $options: "i" },
        });
        const sameCustomerMatches = matchingItems.filter((item) => String(item.customerId) === String(customer._id));
        if (sameCustomerMatches.length === 1) existingItem = sameCustomerMatches[0];
        else if (sameCustomerMatches.length > 1 || matchingItems.length > 1) {
          skippedCount++;
          results.push({
            row: index + 2,
            success: false,
            errors: [`Item Name '${itemName}' matches multiple records; upload a unique item name to avoid updating the wrong customer item`],
          });
          continue;
        } else if (matchingItems.length === 1) {
          // The item name is unique in this company, so changing its customer
          // should update the existing item and its customer link.
          [existingItem] = matchingItems;
        }
      }
      const requiredAction = existingItem ? "edit" : "create";
      if (!permissionCache.has(requiredAction)) {
        const permission = await validateMasterDataRequest(req, requiredAction, "Items");
        permissionCache.set(requiredAction, permission.error || null);
      }
      const permissionError = permissionCache.get(requiredAction);
      if (permissionError) {
        skippedCount++;
        results.push({ row: index + 2, success: false, errors: [permissionError] });
        continue;
      }

      if (existingItem) {
        Object.assign(existingItem, itemData);
        await existingItem.save();
        updatedCount++;
        results.push({ row: index + 2, success: true, action: "updated", itemCode: existingItem.itemCode });
      } else {
        const itemCode = `ITEM-${String(nextCodeNumber).padStart(4, "0")}`;
        nextCodeNumber++;
        await Item.create({ ...itemData, itemCode });
        createdCount++;
        results.push({ row: index + 2, success: true, action: "created", itemCode });
      }
    }

    return NextResponse.json({
      success: true,
      message: `Bulk upload complete: ${createdCount} created, ${updatedCount} updated, ${skippedCount} skipped.`,
      results,
    });
  } catch (err) {
    console.error("Item Bulk Upload Error:", err);
    return NextResponse.json({ success: false, message: "Server error", error: err.message }, { status: 500 });
  }
}
