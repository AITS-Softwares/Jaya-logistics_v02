import  dbConnect from "@/lib/db";
import Warehouse from "@/models/warehouseModels";
import { validateMasterDataRequest } from "@/lib/masterDataPermission";

// ✅ GET WAREHOUSE BY CODE
export async function GET(req, { params }) {
  try {
    const { user, error, status } = await validateMasterDataRequest(req, 'view', 'Warehouse Details', { allowLookup: true });
    if (error) return Response.json({ message: error }, { status });
    await dbConnect();
    const { warehouseCode } = await params;
    const warehouse = await Warehouse.findOne({ warehouseCode, companyId: user.companyId });

    if (!warehouse) {
      return new Response(
        JSON.stringify({ message: "Warehouse not found" }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }

    return new Response(JSON.stringify(warehouse), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error fetching warehouse:", error);
    return new Response(
      JSON.stringify({ message: "Error fetching warehouse", error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}

// ✅ UPDATE WAREHOUSE BY CODE
export async function PUT(req, { params }) {
  try {
    const { user, error, status } = await validateMasterDataRequest(req, 'edit', 'Warehouse Details');
    if (error) return Response.json({ message: error }, { status });
    await dbConnect();
    const { warehouseCode } = await params;
    const updateData = await req.json();
    delete updateData._id;
    delete updateData.companyId;
    const updatedWarehouse = await Warehouse.findOneAndUpdate(
      { warehouseCode, companyId: user.companyId },
      updateData,
      { new: true }
    );

    if (!updatedWarehouse) {
      return new Response(
        JSON.stringify({ message: "Warehouse not found" }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }

    return new Response(JSON.stringify(updatedWarehouse), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error updating warehouse:", error);
    return new Response(
      JSON.stringify({ message: "Error updating warehouse", error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}

// ✅ DELETE WAREHOUSE BY CODE
export async function DELETE(req, { params }) {
  try {
    const { user, error, status } = await validateMasterDataRequest(req, 'delete', 'Warehouse Details');
    if (error) return Response.json({ message: error }, { status });
    await dbConnect();
    const { warehouseCode } = await params;
    const deletedWarehouse = await Warehouse.findOneAndDelete({ warehouseCode, companyId: user.companyId });

    if (!deletedWarehouse) {
      return new Response(
        JSON.stringify({ message: "Warehouse not found" }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ message: "Warehouse deleted successfully" }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error deleting warehouse:", error);
    return new Response(
      JSON.stringify({ message: "Error deleting warehouse", error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
