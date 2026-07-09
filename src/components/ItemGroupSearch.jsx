// "use client";

// import React, { useEffect, useRef, useState } from "react";
// import axios from "axios";
// import useSearch from "@/hooks/useSearch";

// const ItemGroupSearch = ({ onSelectItemGroup, onSelectSubGroup }) => {
//   const dropdownRef = useRef(null);

//   const [showGroupDropdown, setShowGroupDropdown] = useState(false);
//   const [showSubDropdown, setShowSubDropdown] = useState(false);

//   const [groupInput, setGroupInput] = useState("");
//   const [subInput, setSubInput] = useState("");

//   const [selectedItemGroup, setSelectedItemGroup] = useState(null);
//   const [selectedSubGroup, setSelectedSubGroup] = useState(null);

//   const [subGroups, setSubGroups] = useState([]);
//   const [subLoading, setSubLoading] = useState(false);
//   const [error, setError] = useState(null);

//   /* -------- Item Group Search -------- */
//   const itemGroupSearch = useSearch(async (query) => {
//     try {
//       const token = localStorage.getItem("token");
//       if (!token) return [];

//       const { data } = await axios.get(
//         `/api/itemGroups?search=${encodeURIComponent(query || "")}`,
//         { headers: { Authorization: `Bearer ${token}` } }
//       );

//       return data?.data || [];
//     } catch (err) {
//       console.error("Group search:", err.response?.data || err.message);
//       return [];
//     }
//   });

//   /* -------- Sub Group Search (client filter) -------- */
//   const subGroupSearch = useSearch(async (query) => {
//     if (!query) return subGroups || [];

//     const q = query.toLowerCase();
//     return (subGroups || []).filter(
//       (s) =>
//         s.name?.toLowerCase().includes(q) ||
//         s.code?.toLowerCase().includes(q)
//     );
//   });

//   /* -------- Load Sub Groups -------- */
//   const fetchSubGroups = async (groupId) => {
//     try {
//       setSubLoading(true);
//       const token = localStorage.getItem("token");
//       if (!token) return;

//       const { data } = await axios.get(
//         `/api/itemSubGroups?groupId=${groupId}`,
//         { headers: { Authorization: `Bearer ${token}` } }
//       );

//       setSubGroups(data?.data || []);
//     } catch (err) {
//       console.error("Subgroup fetch:", err.response?.data || err.message);
//       setSubGroups([]);
//       setError("Failed to load sub groups");
//     } finally {
//       setSubLoading(false);
//     }
//   };

//   /* -------- Outside click close -------- */
//   useEffect(() => {
//     const handleOutside = (e) => {
//       if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
//         setShowGroupDropdown(false);
//         setShowSubDropdown(false);
//       }
//     };
//     document.addEventListener("mousedown", handleOutside);
//     return () => document.removeEventListener("mousedown", handleOutside);
//   }, []);

//   /* -------- Select Group -------- */
//   const handleSelectGroup = async (g) => {
//     setSelectedItemGroup(g);
//     setGroupInput(g.name);
//     setShowGroupDropdown(false);

//     onSelectItemGroup?.(g);

//     setSelectedSubGroup(null);
//     setSubInput("");
//     onSelectSubGroup?.(null);

//     await fetchSubGroups(g._id);

//     setShowSubDropdown(true);
//   };

//   /* -------- Select Sub Group -------- */
//   const handleSelectSubGroup = (s) => {
//     setSelectedSubGroup(s);
//     setSubInput(s.name);
//     setShowSubDropdown(false);
//     onSelectSubGroup?.(s);
//   };

//   return (
//     <div ref={dropdownRef} className="relative space-y-3">
//       {/* ITEM GROUP */}
//       <div>
//         <label className="block text-sm font-medium mb-1">Item Group *</label>

//         <input
//           value={groupInput}
//           placeholder="Search Item Group"
//           onChange={async (e) => {
//             const v = e.target.value;
//             setGroupInput(v);
//             setSelectedItemGroup(null);
//             setShowGroupDropdown(true);
//             await itemGroupSearch.handleSearch(v);
//           }}
//           onFocus={async () => {
//             setShowGroupDropdown(true);
//             if (!itemGroupSearch.results.length)
//               await itemGroupSearch.handleSearch("");
//           }}
//           className="w-full border px-4 py-2 rounded focus:ring-2 focus:ring-blue-200"
//         />

//         {showGroupDropdown && (
//           <div className="absolute w-full mt-1 bg-white border rounded shadow max-h-52 overflow-y-auto z-30">
//             {itemGroupSearch.loading && (
//               <p className="p-2 text-sm text-gray-500">Loading...</p>
//             )}

//             {!itemGroupSearch.loading &&
//               itemGroupSearch.results.length === 0 && (
//                 <p className="p-2 text-sm text-gray-500">No groups found</p>
//               )}

//             {itemGroupSearch.results.map((g) => (
//               <div
//                 key={g._id}
//                 onClick={() => handleSelectGroup(g)}
//                 className="px-3 py-2 hover:bg-gray-100 cursor-pointer"
//               >
//                 <div className="font-medium">{g.name}</div>
//                 <div className="text-xs text-gray-500">{g.code}</div>
//               </div>
//             ))}
//           </div>
//         )}
//       </div>

//       {/* SUB GROUP */}
//       {selectedItemGroup && (
//         <div>
//           <label className="block text-sm font-medium mb-1">Sub Group</label>

//           <input
//             value={subInput}
//             disabled={subLoading}
//             placeholder={subLoading ? "Loading..." : "Search Sub Group"}
//             onChange={(e) => {
//               const v = e.target.value;
//               setSubInput(v);
//               setSelectedSubGroup(null);
//               subGroupSearch.handleSearch(v);
//               setShowSubDropdown(true);
//             }}
//             onFocus={() => setShowSubDropdown(true)}
//             className="w-full border px-4 py-2 rounded focus:ring-2 focus:ring-indigo-200 disabled:bg-gray-100"
//           />

//           {showSubDropdown && (
//             <div className="absolute w-full mt-1 bg-white border rounded shadow max-h-52 overflow-y-auto z-20">
//               {subLoading && (
//                 <p className="p-2 text-sm text-gray-500">Loading...</p>
//               )}

//               {!subLoading &&
//                 subGroupSearch.results.map((s) => (
//                   <div
//                     key={s._id}
//                     onClick={() => handleSelectSubGroup(s)}
//                     className="px-3 py-2 hover:bg-gray-100 cursor-pointer"
//                   >
//                     <div className="font-medium">{s.name}</div>
//                     <div className="text-xs text-gray-500">{s.code}</div>
//                   </div>
//                 ))}
//             </div>
//           )}
//         </div>
//       )}

//       {error && <p className="text-sm text-red-600">{error}</p>}
//     </div>
//   );
// };

// export default ItemGroupSearch;


"use client";

import React, { useEffect, useRef, useState } from "react";
import axios from "axios";
import useSearch from "@/hooks/useSearch";

const ItemGroupSearch = ({ 
  onSelectItemGroup, 
  onSelectSubGroup,
  availableSubgroups = [],
  hideSubgroup = false // NEW: prop to hide subgroup
}) => {
  const dropdownRef = useRef(null);

  const [showGroupDropdown, setShowGroupDropdown] = useState(false);
  const [showSubDropdown, setShowSubDropdown] = useState(false);

  const [groupInput, setGroupInput] = useState("");
  const [subInput, setSubInput] = useState("");

  const [selectedItemGroup, setSelectedItemGroup] = useState(null);
  const [selectedSubGroup, setSelectedSubGroup] = useState(null);

  const [subGroups, setSubGroups] = useState([]);
  const [subLoading, setSubLoading] = useState(false);
  const [error, setError] = useState(null);

  /* -------- Item Group Search -------- */
  const itemGroupSearch = useSearch(async (query) => {
    try {
      const token = localStorage.getItem("token");
      if (!token) return [];

      const { data } = await axios.get(
        `/api/itemGroups?search=${encodeURIComponent(query || "")}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      return data?.data || [];
    } catch (err) {
      console.error("Group search:", err.response?.data || err.message);
      return [];
    }
  });

  /* -------- Outside click close -------- */
  useEffect(() => {
    const handleOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setShowGroupDropdown(false);
        setShowSubDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, []);

  /* -------- Select Group -------- */
  const handleSelectGroup = (g) => {
    setSelectedItemGroup(g);
    setGroupInput(g.name);
    setShowGroupDropdown(false);

    onSelectItemGroup?.(g);

    setSelectedSubGroup(null);
    setSubInput("");
    onSelectSubGroup?.(null);
  };

  return (
    <div ref={dropdownRef} className="relative space-y-3">
      {/* ITEM GROUP */}
      <div>
        <label className="block text-sm font-medium mb-1">Item Group *</label>

        <input
          value={groupInput}
          placeholder="Search Item Group"
          onChange={async (e) => {
            const v = e.target.value;
            setGroupInput(v);
            setSelectedItemGroup(null);
            setShowGroupDropdown(true);
            await itemGroupSearch.handleSearch(v);
          }}
          onFocus={async () => {
            setShowGroupDropdown(true);
            if (!itemGroupSearch.results.length)
              await itemGroupSearch.handleSearch("");
          }}
          className="w-full border px-4 py-2 rounded focus:ring-2 focus:ring-blue-200"
        />

        {showGroupDropdown && (
          <div className="absolute w-full mt-1 bg-white border rounded shadow max-h-52 overflow-y-auto z-30">
            {itemGroupSearch.loading && (
              <p className="p-2 text-sm text-gray-500">Loading...</p>
            )}

            {!itemGroupSearch.loading &&
              itemGroupSearch.results.length === 0 && (
                <p className="p-2 text-sm text-gray-500">No groups found</p>
              )}

            {itemGroupSearch.results.map((g) => (
              <div
                key={g._id}
                onClick={() => handleSelectGroup(g)}
                className="px-3 py-2 hover:bg-gray-100 cursor-pointer"
              >
                <div className="font-medium">{g.name}</div>
                <div className="text-xs text-gray-500">{g.code}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* SUB GROUP - HIDDEN because we use the dropdown in parent */}
      {/* Only show if hideSubgroup is false */}
      {!hideSubgroup && selectedItemGroup && (
        <div>
          <label className="block text-sm font-medium mb-1">Sub Group</label>

          <input
            value={subInput}
            disabled={subLoading}
            placeholder={subLoading ? "Loading..." : "Search Sub Group"}
            onChange={(e) => {
              const v = e.target.value;
              setSubInput(v);
              setSelectedSubGroup(null);
              setShowSubDropdown(true);
            }}
            onFocus={() => setShowSubDropdown(true)}
            className="w-full border px-4 py-2 rounded focus:ring-2 focus:ring-indigo-200 disabled:bg-gray-100"
          />

          {showSubDropdown && (
            <div className="absolute w-full mt-1 bg-white border rounded shadow max-h-52 overflow-y-auto z-20">
              {subLoading && (
                <p className="p-2 text-sm text-gray-500">Loading...</p>
              )}

              {!subLoading && subGroups.length === 0 && (
                <p className="p-2 text-sm text-gray-500">No sub groups found</p>
              )}

              {!subLoading &&
                subGroups.map((s) => (
                  <div
                    key={s._id}
                    onClick={() => handleSelectSubGroup(s)}
                    className="px-3 py-2 hover:bg-gray-100 cursor-pointer"
                  >
                    <div className="font-medium">{s.name}</div>
                    <div className="text-xs text-gray-500">{s.code}</div>
                  </div>
                ))}
            </div>
          )}
        </div>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
};

export default ItemGroupSearch;