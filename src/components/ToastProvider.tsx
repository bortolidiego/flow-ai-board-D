"use client"; 
import React from 'react'; 
import { Toaster } from 'sonner'; 

const ToastProvider = () => { 
  return ( 
    <Toaster 
      placement="bottom-right" 
      position="fixed" 
      top="1/5" 
      right="-100px" 
      direction="rtl" 
      transitionDuration="300" 
      transitionTimingFunction="ease" 
    /> 
  ); 
}; 

export default ToastProvider;