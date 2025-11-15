"use client"; 
import { Toaster } from 'sonner'; 

export const showSuccess = (message: string) => { 
  Toaster.success(message); 
}; 

export const showError = (message: string) => { 
  Toaster.error(message); 
}; 

export const showLoading = (message: string) => { 
  return Toaster.loading(message); 
}; 

export const dismissToast = (toastId: string) => { 
  Toaster.dismiss(toastId); 
};