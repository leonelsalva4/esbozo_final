import {createContext} from 'react';
export interface OperationsContext {inventory?:string;lot?:string;projection?:string}
export const ShellActions=createContext<{onGuide?:()=>void;onAbout?:()=>void;onOperations?:(context?:OperationsContext)=>void}>({});
