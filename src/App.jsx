import { useState } from "react";

import { QueryClient, QueryClientProvider, useQueries } from "@tanstack/react-query";

import axios from "axios";

import { subDays, formatISO } from "date-fns";

import zipWith from "lodash/zipWith.js";
import intersection from "lodash/intersection.js";

import MyLine from "./components/MyLine";
import MySwitch from "./components/Switch";

const queryClient = new QueryClient({
   defaultOptions: {
      queries: {
         staleTime: 24 * 60 * 60 * 1000, // 24 Stunden
         cacheTime: 48 * 60 * 60 * 1000, // 48 Stunden
         retry: false
      }
   }
});

export default function App() {
   return (
      <QueryClientProvider client={queryClient}>
         <Plot />
      </QueryClientProvider>
   );
}

const axiosENTSOG = async (id, type, tageVergangenheit) => {
   // id: "DE-TSO-0009ITP-00080entry"
   // type: "Physical+Flow" bzw. "Allocation"

   const jetzt = new Date();

   const from = "2022-07-01";
   const to = formatISO(subDays(jetzt, tageVergangenheit), { representation: "date" });

   const { data } = await axios.get(
      `https://transparency.entsog.eu/api/v1/operationalData?limit=-1&cutPeriods=true&periodize=0&indicator=${type}&pointDirection=${id}&from=${from}&to=${to}&timezone=CET&periodType=day`
   );

   return data;
};

const punkte = [
   // { id: "DE-TSO-0005ITP-00086entry", name: "Emden (NPT) (GUD) (\u2192 D)" }, // "No Data Available"
   // { id: "NL-TSO-0001ITP-00161entry", name: "Emden (NPT) (GTS) (\u2192 NL)" }, // "No Data Available"
   // { id: "DE-TSO-0002ITP-00075entry", name: "Emden (NPT) (TG) (\u2192 D)" }, // "No Data Available"
   // { id: "DE-TSO-0013ITP-00211entry", name: "Dornum / NETRA (jordgas Transport) (\u2192 D)" }, // "No Data Available" für Physical Flow
   { id: "DE-TSO-0009ITP-00080entry", name: "Emden OGE" }, // Emden (EPT1) (OGE)
   { id: "DE-TSO-0005ITP-00081entry", name: "Emden GUD" }, // Emden (EPT1) (GUD)
   { id: "NL-TSO-0001ITP-00160entry", name: "Emden GTS" }, // Emden (EPT1) (GTS)
   { id: "DE-TSO-0002ITP-00105entry", name: "Emden TG" }, // Emden (EPT1) (TG) (ignorieren beim Physical Flow!)
   { id: "DE-TSO-0009ITP-00126entry", name: "Dornum OGE" }, // Dornum / NETRA (OGE)
   { id: "DE-TSO-0005ITP-00188entry", name: "Dornum GUD" }, // Dornum / NETRA (GUD) (ignorieren beim Physical Flow!)
   { id: "DE-TSO-0009ITP-00525entry", name: "Dornum GASPOOL" }, // Dornum GASPOOL (ignorieren beim Physical Flow!)
   { id: "de-tso-0001itp-00096exit", name: "Mallnow (D \u2192 PL)" },
   { id: "dk-tso-0001itp-00630entry", name: "Nybro (NO \u2192 PL)" },
   { id: "FR-TSO-0003ITP-00045entry", name: "Dunkerque (NO \u2192 FR)" },
   { id: "BE-TSO-0001ITP-00106entry", name: "Zeebrugge ZPT (NO \u2192 BE)" }
   // { id: "UK-TSO-0001ITP-00022entry", name: "St. Fergus (NO \u2192 GB)" }
];

const resultsToPlotData = (results, MSm3, proStunde) => {
   let faktor = 1 / (24 * 1000000); // GWh/h (Tagesmittel)
   if (!MSm3 && !proStunde) faktor = faktor * 24; // GWh/d
   if (MSm3 && !proStunde) faktor = faktor * 2.2; // MSm³/d
   if (MSm3 && proStunde) faktor = (faktor * 2.2) / 24; // MSm³/h (Tagesmittel)

   return results.map(el => ({
      id: punkte.find(p => p.id === el.data.meta.query.pointDirection).name,
      data: el.data.operationalData.map(d => ({
         x: d.periodFrom.slice(0, 10),
         y: d.value * faktor
      }))
   }));
};

const Plot = () => {
   const [allocation, setAllocation] = useState(false);
   const [MSm3, setMSm3] = useState(false);
   const [proStunde, setProStunde] = useState(false);

   const tageVergangenheit = 2; // Letzter Tag der Zeitreihe = vorgestern

   const resultsFlow = useQueries({
      queries: punkte.map(el => ({
         queryKey: [el.id, "Physical+Flow", tageVergangenheit],
         queryFn: () => axiosENTSOG(el.id, "Physical+Flow", tageVergangenheit)
      }))
   });

   const resultsAllocation = useQueries({
      queries: punkte.map(el => ({ queryKey: [el.id, "Allocation", tageVergangenheit], queryFn: () => axiosENTSOG(el.id, "Allocation", tageVergangenheit) }))
   });

   const isLoading = resultsFlow.some(el => el.isLoading) || resultsAllocation.some(el => el.isLoading);
   const isError = resultsFlow.some(el => el.isError) || resultsAllocation.some(el => el.isError);

   if (isLoading) return <div className="flex justify-center mt-20 animate-pulse">Datenabruf ENTSOG Transparency Platform</div>;
   if (isError) return <div className="flex justify-center mt-20">Serverfehler ENTSOG Transparency Platform</div>;

   let einheit = MSm3 ? "MSm³" : "GWh";
   einheit += proStunde ? "/h" : "/d";

   let legendeLinks = allocation ? "Allokation in " : "Gasfluss in ";
   legendeLinks += einheit;
   legendeLinks += proStunde ? " (Tagesmittel)" : "";

   const plotDataFlow = resultsToPlotData(resultsFlow, MSm3, proStunde);

   const xAchseFlowEmdenOGE = plotDataFlow.find(el => el.id === "Emden OGE").data.map(el => el.x);
   const xAchseFlowEmdenGUD = plotDataFlow.find(el => el.id === "Emden GUD").data.map(el => el.x);
   const xAchseFlowEmdenGTS = plotDataFlow.find(el => el.id === "Emden GTS").data.map(el => el.x);

   // x-Achse reduziert auf Tage, die in allen Datensätzen vorkommen
   const xAchseFlowEmdenREDUZIERT = intersection(xAchseFlowEmdenOGE, xAchseFlowEmdenGUD, xAchseFlowEmdenGTS);

   const yAchseFlowEmdenOGE = xAchseFlowEmdenREDUZIERT.map(tag => plotDataFlow.find(el => el.id === "Emden OGE").data.find(el => el.x === tag).y);
   const yAchseFlowEmdenGUD = xAchseFlowEmdenREDUZIERT.map(tag => plotDataFlow.find(el => el.id === "Emden GUD").data.find(el => el.x === tag).y);
   const yAchseFlowEmdenGTS = xAchseFlowEmdenREDUZIERT.map(tag => plotDataFlow.find(el => el.id === "Emden GTS").data.find(el => el.x === tag).y);

   // const yAchseFlowEmdenOGE = plotDataFlow.find(el => el.id === "Emden OGE").data.map(el => el.y);
   // const yAchseFlowEmdenGUD = plotDataFlow.find(el => el.id === "Emden GUD").data.map(el => el.y);
   // const yAchseFlowEmdenGTS = plotDataFlow.find(el => el.id === "Emden GTS").data.map(el => el.y);

   const yAchseSummeFlowEmden = zipWith(yAchseFlowEmdenOGE, yAchseFlowEmdenGUD, yAchseFlowEmdenGTS, (a, b, c) => a + b + c);

   const xAchseFlowDornumOGE = plotDataFlow.find(el => el.id === "Dornum OGE").data.map(el => el.x);
   const yAchseFlowDornumOGE = plotDataFlow.find(el => el.id === "Dornum OGE").data.map(el => el.y); // = Summe Flow Dornum

   plotDataFlow.push({
      id: "Dornum (Summe Entry)",
      data: zipWith(xAchseFlowDornumOGE, yAchseFlowDornumOGE, (a, b) => ({ x: a, y: b })).filter(el => !isNaN(el.y))
   });
   plotDataFlow.push({
      id: "Emden (Summe Entry inkl. NL)",
      data: zipWith(xAchseFlowEmdenREDUZIERT, yAchseSummeFlowEmden, (a, b) => ({ x: a, y: b })).filter(el => !isNaN(el.y))
   });

   const plotDataAllocation = resultsToPlotData(resultsAllocation, MSm3, proStunde);

   const xAchseAllocationEmdenOGE = plotDataAllocation.find(el => el.id === "Emden OGE").data.map(el => el.x);
   const xAchseAllocationEmdenGUD = plotDataAllocation.find(el => el.id === "Emden GUD").data.map(el => el.x);
   const xAchseAllocationEmdenGTS = plotDataAllocation.find(el => el.id === "Emden GTS").data.map(el => el.x);
   const xAchseAllocationEmdenTG = plotDataAllocation.find(el => el.id === "Emden TG").data.map(el => el.x);
   const xAchseAllocationDornumOGE = plotDataAllocation.find(el => el.id === "Dornum OGE").data.map(el => el.x);
   const xAchseAllocationDornumGUD = plotDataAllocation.find(el => el.id === "Dornum GUD").data.map(el => el.x);
   const xAchseAllocationDornumGASPOOL = plotDataAllocation.find(el => el.id === "Dornum GASPOOL").data.map(el => el.x);

   // x-Achse reduziert auf Tage, die in allen Datensätzen vorkommen
   const xAchseAllocationEmdenREDUZIERT = intersection(xAchseAllocationEmdenOGE, xAchseAllocationEmdenGUD, xAchseAllocationEmdenGTS, xAchseAllocationEmdenTG);
   const xAchseAllocationDornumREDUZIERT = intersection(xAchseAllocationDornumOGE, xAchseAllocationDornumGUD, xAchseAllocationDornumGASPOOL);

   const yAchseAllocationEmdenOGE = xAchseAllocationEmdenREDUZIERT.map(
      tag => plotDataAllocation.find(el => el.id === "Emden OGE").data.find(el => el.x === tag).y
   );
   const yAchseAllocationEmdenGUD = xAchseAllocationEmdenREDUZIERT.map(
      tag => plotDataAllocation.find(el => el.id === "Emden GUD").data.find(el => el.x === tag).y
   );
   const yAchseAllocationEmdenGTS = xAchseAllocationEmdenREDUZIERT.map(
      tag => plotDataAllocation.find(el => el.id === "Emden GTS").data.find(el => el.x === tag).y
   );
   const yAchseAllocationEmdenTG = xAchseAllocationEmdenREDUZIERT.map(
      tag => plotDataAllocation.find(el => el.id === "Emden TG").data.find(el => el.x === tag).y
   );
   const yAchseAllocationDornumOGE = xAchseAllocationDornumREDUZIERT.map(
      tag => plotDataAllocation.find(el => el.id === "Dornum OGE").data.find(el => el.x === tag).y
   );
   const yAchseAllocationDornumGUD = xAchseAllocationDornumREDUZIERT.map(
      tag => plotDataAllocation.find(el => el.id === "Dornum GUD").data.find(el => el.x === tag).y
   );
   const yAchseAllocationDornumGASPOOL = xAchseAllocationDornumREDUZIERT.map(
      tag => plotDataAllocation.find(el => el.id === "Dornum GASPOOL").data.find(el => el.x === tag).y
   );

   // const yAchseAllocationEmdenOGE = plotDataAllocation.find(el => el.id === "Emden OGE").data.map(el => el.y);
   // const yAchseAllocationEmdenGUD = plotDataAllocation.find(el => el.id === "Emden GUD").data.map(el => el.y);
   // const yAchseAllocationEmdenGTS = plotDataAllocation.find(el => el.id === "Emden GTS").data.map(el => el.y);
   // const yAchseAllocationEmdenTG = plotDataAllocation.find(el => el.id === "Emden TG").data.map(el => el.y);
   // const yAchseAllocationDornumOGE = plotDataAllocation.find(el => el.id === "Dornum OGE").data.map(el => el.y);
   // const yAchseAllocationDornumGUD = plotDataAllocation.find(el => el.id === "Dornum GUD").data.map(el => el.y);
   // const yAchseAllocationDornumGASPOOL = plotDataAllocation.find(el => el.id === "Dornum GASPOOL").data.map(el => el.y);

   const yAchseSummeAllocationEmden = zipWith(
      yAchseAllocationEmdenOGE,
      yAchseAllocationEmdenGUD,
      yAchseAllocationEmdenGTS,
      yAchseAllocationEmdenTG,
      (a, b, c, d) => a + b + c + d
   );
   const yAchseSummeAllocationDornum = zipWith(yAchseAllocationDornumOGE, yAchseAllocationDornumGUD, yAchseAllocationDornumGASPOOL, (a, b, c) => a + b + c);

   plotDataAllocation.push({
      id: "Dornum (Summe Entry)",
      data: zipWith(xAchseAllocationDornumREDUZIERT, yAchseSummeAllocationDornum, (a, b) => ({ x: a, y: b })).filter(el => !isNaN(el.y))
   });
   plotDataAllocation.push({
      id: "Emden (Summe Entry inkl. NL)",
      data: zipWith(xAchseAllocationEmdenREDUZIERT, yAchseSummeAllocationEmden, (a, b) => ({ x: a, y: b })).filter(el => !isNaN(el.y))
   });

   const flowPlot = plotDataFlow.filter(
      el =>
         el.id !== "Emden OGE" &&
         el.id !== "Emden GUD" &&
         el.id !== "Emden GTS" &&
         el.id !== "Emden TG" &&
         el.id !== "Dornum OGE" &&
         el.id !== "Dornum GUD" &&
         el.id !== "Dornum GASPOOL"
   );

   const allocationPlot = plotDataAllocation.filter(
      el =>
         el.id !== "Emden OGE" &&
         el.id !== "Emden GUD" &&
         el.id !== "Emden GTS" &&
         el.id !== "Emden TG" &&
         el.id !== "Dornum OGE" &&
         el.id !== "Dornum GUD" &&
         el.id !== "Dornum GASPOOL"
   );

   const maxY = Math.max(...flowPlot.map(el => Math.max(...el.data.map(el => el.y))), ...allocationPlot.map(el => Math.max(...el.data.map(el => el.y))));

   return (
      <div className="flex justify-center mt-10">
         <div>
            <div className="ml-9 mb-6">
               <div className="mb-3">
                  <h1 className="font-semibold text-2xl">Einfluss der Baltic Pipe auf Importe aus Norwegen</h1>
                  <h2 className="text-[0.6rem] text-stone-400">Daten der ENTSOG Transparency Platform</h2>
               </div>
               <div className="flex space-x-6 text-sm">
                  <div className="flex space-x-1.5 items-center">
                     <p>Gasfluss</p>
                     <MySwitch checked={allocation} setChecked={setAllocation} />
                     <p>Allokation</p>
                  </div>
                  <div className="flex space-x-1.5 items-center">
                     <p>GWh</p>
                     <MySwitch checked={MSm3} setChecked={setMSm3} />
                     <p>MSm³</p>
                  </div>
                  <div className="flex space-x-1.5 items-center">
                     <p>pro Tag</p>
                     <MySwitch checked={proStunde} setChecked={setProStunde} />
                     <p>pro Stunde (Tagesmittel)</p>
                  </div>
               </div>
            </div>
            {!allocation && <MyLine data={flowPlot} maxY={maxY} legendeLinks={legendeLinks} einheitTooltip={einheit} />}
            {allocation && <MyLine data={allocationPlot} maxY={maxY} legendeLinks={legendeLinks} einheitTooltip={einheit} />}
         </div>
      </div>
   );
};
