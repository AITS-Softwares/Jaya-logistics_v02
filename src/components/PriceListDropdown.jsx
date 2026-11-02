"use client";
import {useEffect,useId,useMemo,useRef,useState} from 'react';
import {createPortal} from 'react-dom';
import {eligiblePriceLists,priceListEmptyMessage,priceListMenuPosition} from '@/lib/priceListAvailability.mjs';

export default function PriceListDropdown({rateMasters=[],selectedValue='',onSelect,locationName,branchId,customerId,placeholder='Select Price List...',readOnly=false,rateCalculationMode='order_weight',filterByLocation=false}) {
  const [searchQuery,setSearchQuery]=useState(selectedValue || '');
  const [showDropdown,setShowDropdown]=useState(false);
  const [activeIndex,setActiveIndex]=useState(-1);
  const [position,setPosition]=useState(null);
  const rootRef=useRef(null),inputRef=useRef(null),menuRef=useRef(null);
  const listId=useId();
  const filteredRateMasters=useMemo(()=>eligiblePriceLists({rateMasters,branchId,customerId,locationName,rateCalculationMode,filterByLocation}),[rateMasters,branchId,customerId,locationName,rateCalculationMode,filterByLocation]);
  const selected=Boolean(selectedValue && searchQuery===selectedValue);
  const searchedItems=useMemo(()=>selected || !searchQuery.trim()?filteredRateMasters:filteredRateMasters.filter(item=>String(item.title || '').toLowerCase().includes(searchQuery.trim().toLowerCase())),[filteredRateMasters,searchQuery,selected]);

  useEffect(()=>{setSearchQuery(selectedValue || '');},[selectedValue]);
  useEffect(()=>{if(readOnly)setShowDropdown(false);},[readOnly]);
  useEffect(()=>{setActiveIndex(-1);},[showDropdown,searchQuery,filteredRateMasters]);
  useEffect(()=>{
    if(!showDropdown)return;
    const updatePosition=event=>{
      // Scrolling the options must keep the menu open and its scroll position.
      if(event?.target && menuRef.current?.contains(event.target))return;
      const rect=inputRef.current?.getBoundingClientRect();
      if(!rect)return;
      if(rect.bottom<=0 || rect.top>=window.innerHeight || rect.right<=0 || rect.left>=window.innerWidth){setShowDropdown(false);return;}
      setPosition(priceListMenuPosition(rect,{width:window.innerWidth,height:window.innerHeight}));
    };
    updatePosition();
    const outside=event=>{if(!rootRef.current?.contains(event.target) && !menuRef.current?.contains(event.target))setShowDropdown(false);};
    window.addEventListener('scroll',updatePosition,true);
    window.addEventListener('resize',updatePosition);
    document.addEventListener('pointerdown',outside);
    return ()=>{window.removeEventListener('scroll',updatePosition,true);window.removeEventListener('resize',updatePosition);document.removeEventListener('pointerdown',outside);};
  },[showDropdown]);
  useEffect(()=>{if(activeIndex>=0)menuRef.current?.querySelector(`[data-index="${activeIndex}"]`)?.scrollIntoView({block:'nearest'});},[activeIndex]);

  const handleSelectItem=item=>{
    if(readOnly)return;
    setSearchQuery(item.title);setShowDropdown(false);onSelect?.(item);
  };
  const handleInputFocus=()=>{if(!readOnly)setShowDropdown(true);};
  const handleKeyDown=event=>{
    if(readOnly)return;
    if(event.key==='Escape'){event.preventDefault();setShowDropdown(false);return;}
    if(event.key==='Tab'){setShowDropdown(false);return;}
    if(event.key==='Enter'){event.preventDefault();if(showDropdown && activeIndex>=0 && searchedItems[activeIndex])handleSelectItem(searchedItems[activeIndex]);return;}
    if(!searchedItems.length)return;
    if(event.key==='ArrowDown'){event.preventDefault();setShowDropdown(true);setActiveIndex(index=>Math.min(index+1,searchedItems.length-1));}
    if(event.key==='ArrowUp'){event.preventDefault();setShowDropdown(true);setActiveIndex(index=>index<0?searchedItems.length-1:Math.max(0,index-1));}
  };
  const clearSelection=()=>{
    if(readOnly)return;
    setSearchQuery('');onSelect?.(null);setShowDropdown(true);inputRef.current?.focus();
  };

  return <div ref={rootRef} className="relative w-full">
    <input ref={inputRef} role="combobox" aria-label="Price list" aria-expanded={showDropdown && !readOnly} aria-controls={showDropdown?listId:undefined} aria-autocomplete="list" aria-activedescendant={showDropdown && activeIndex>=0?`${listId}-${activeIndex}`:undefined}
      type="text" value={searchQuery} onChange={event=>{if(!readOnly && !selected){setSearchQuery(event.target.value);setShowDropdown(true);}}} onFocus={handleInputFocus} onClick={handleInputFocus} onKeyDown={handleKeyDown}
      readOnly={readOnly || selected} placeholder={placeholder} autoComplete="off" className={`w-full rounded-lg border border-slate-200 py-1.5 pl-2 pr-12 text-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-200 ${readOnly?'bg-slate-50 cursor-not-allowed':'bg-white'}`} />
    {selectedValue && !readOnly && <button type="button" onMouseDown={event=>event.preventDefault()} onClick={clearSelection} aria-label="Clear selected price list" className="absolute right-7 top-1.5 text-slate-500 hover:text-red-600">×</button>}
    <button type="button" disabled={readOnly} onMouseDown={event=>event.preventDefault()} onClick={()=>{if(!showDropdown)inputRef.current?.focus();setShowDropdown(!showDropdown);}} aria-label={showDropdown?'Close price lists':'Open price lists'} aria-expanded={showDropdown && !readOnly} className="absolute right-2 top-2 text-slate-400 disabled:cursor-not-allowed">⌄</button>
    {showDropdown && !readOnly && position && typeof document!=='undefined' && createPortal(
      <div ref={menuRef} id={listId} role="listbox" aria-label="Price lists" className="fixed z-[10000] overflow-y-auto overscroll-contain rounded-lg border border-slate-200 bg-white shadow-xl" style={position}>
        <div className="sticky top-0 border-b bg-gray-50 px-3 py-2 text-xs font-semibold text-slate-600">Select Price List</div>
        {searchedItems.length?searchedItems.map((item,index)=><button key={item._id} id={`${listId}-${index}`} data-index={index} role="option" aria-selected={selectedValue===item.title} tabIndex={-1} type="button" onMouseDown={event=>event.preventDefault()} onClick={()=>handleSelectItem(item)} onMouseEnter={()=>setActiveIndex(index)} className={`block w-full border-b border-slate-100 px-3 py-2 text-left last:border-b-0 hover:bg-slate-50 ${activeIndex===index || selectedValue===item.title?'bg-sky-50':''}`}>
          <span className="block text-sm font-medium text-slate-800">{item.title}</span>
          <span className="mt-0.5 block text-xs text-slate-500">Branch: {item.branchName || 'N/A'} | Customer: {item.customerName || 'N/A'} | Locations: {item.locationRates?.length || 0}</span>
        </button>):<div className="p-3 text-sm text-slate-500">{searchQuery.trim() && !selected?`No price lists found for "${searchQuery}"`:priceListEmptyMessage({rateMasters,branchId,customerId,locationName:filterByLocation?locationName:undefined,rateCalculationMode})}</div>}
      </div>,document.body)}
  </div>;
}
