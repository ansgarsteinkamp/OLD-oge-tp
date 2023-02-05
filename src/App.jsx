import { useState } from "react";

import { QueryClient, QueryClientProvider, useQueries } from "@tanstack/react-query";

import { Line } from "@nivo/line";

import axios from "axios";

import { subDays, formatISO } from "date-fns";

import isEqual from "lodash/isEqual.js";
import zipWith from "lodash/zipWith.js";

import MySwitch from "./UI/Switch";

const queryClient = new QueryClient({
   defaultOptions: {
      queries: {
         staleTime: 480 * 60 * 1000, // 480 Minuten = 8 Stunden
         cacheTime: 960 * 60 * 1000 // 960 Minuten = 16 Stunden
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

   const from = "2022-11-01";
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
   const [tageVergangenheit, setTageVergangenheit] = useState(1);

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
   const xAchseFlowEmdenTG = plotDataFlow.find(el => el.id === "Emden TG").data.map(el => el.x);
   const xAchseFlowDornumOGE = plotDataFlow.find(el => el.id === "Dornum OGE").data.map(el => el.x);
   const xAchseFlowDornumGUD = plotDataFlow.find(el => el.id === "Dornum GUD").data.map(el => el.x);
   const xAchseFlowDornumGASPOOL = plotDataFlow.find(el => el.id === "Dornum GASPOOL").data.map(el => el.x);

   const yAchseFlowEmdenOGE = plotDataFlow.find(el => el.id === "Emden OGE").data.map(el => el.y);
   const yAchseFlowEmdenGUD = plotDataFlow.find(el => el.id === "Emden GUD").data.map(el => el.y);
   const yAchseFlowEmdenGTS = plotDataFlow.find(el => el.id === "Emden GTS").data.map(el => el.y);
   // const yAchseFlowEmdenTG = plotDataFlow.find(el => el.id === "Emden TG").data.map(el => el.y);
   const yAchseFlowDornumOGE = plotDataFlow.find(el => el.id === "Dornum OGE").data.map(el => el.y);
   // const yAchseFlowDornumGUD = plotDataFlow.find(el => el.id === "Dornum GUD").data.map(el => el.y);
   // const yAchseFlowDornumGASPOOL = plotDataFlow.find(el => el.id === "Dornum GASPOOL").data.map(el => el.y);

   const yAchseSummeFlowEmden = zipWith(yAchseFlowEmdenOGE, yAchseFlowEmdenGUD, yAchseFlowEmdenGTS, (a, b, c) => a + b + c);
   const yAchseSummeFlowDornum = yAchseFlowDornumOGE;

   plotDataFlow.push({
      id: "Dornum (Summe Entry)",
      data: zipWith(xAchseFlowDornumOGE, yAchseSummeFlowDornum, (a, b) => ({ x: a, y: b })).filter(el => !isNaN(el.y))
   });
   plotDataFlow.push({
      id: "Emden (Summe Entry)",
      data: zipWith(xAchseFlowEmdenOGE, yAchseSummeFlowEmden, (a, b) => ({ x: a, y: b })).filter(el => !isNaN(el.y))
   });

   const plotDataAllocation = resultsToPlotData(resultsAllocation, MSm3, proStunde);

   const xAchseAllocationEmdenOGE = plotDataAllocation.find(el => el.id === "Emden OGE").data.map(el => el.x);
   const xAchseAllocationEmdenGUD = plotDataAllocation.find(el => el.id === "Emden GUD").data.map(el => el.x);
   const xAchseAllocationEmdenGTS = plotDataAllocation.find(el => el.id === "Emden GTS").data.map(el => el.x);
   const xAchseAllocationEmdenTG = plotDataAllocation.find(el => el.id === "Emden TG").data.map(el => el.x);
   const xAchseAllocationDornumOGE = plotDataAllocation.find(el => el.id === "Dornum OGE").data.map(el => el.x);
   const xAchseAllocationDornumGUD = plotDataAllocation.find(el => el.id === "Dornum GUD").data.map(el => el.x);
   const xAchseAllocationDornumGASPOOL = plotDataAllocation.find(el => el.id === "Dornum GASPOOL").data.map(el => el.x);

   const yAchseAllocationEmdenOGE = plotDataAllocation.find(el => el.id === "Emden OGE").data.map(el => el.y);
   const yAchseAllocationEmdenGUD = plotDataAllocation.find(el => el.id === "Emden GUD").data.map(el => el.y);
   const yAchseAllocationEmdenGTS = plotDataAllocation.find(el => el.id === "Emden GTS").data.map(el => el.y);
   const yAchseAllocationEmdenTG = plotDataAllocation.find(el => el.id === "Emden TG").data.map(el => el.y);
   const yAchseAllocationDornumOGE = plotDataAllocation.find(el => el.id === "Dornum OGE").data.map(el => el.y);
   const yAchseAllocationDornumGUD = plotDataAllocation.find(el => el.id === "Dornum GUD").data.map(el => el.y);
   const yAchseAllocationDornumGASPOOL = plotDataAllocation.find(el => el.id === "Dornum GASPOOL").data.map(el => el.y);

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
      data: zipWith(xAchseAllocationDornumOGE, yAchseSummeAllocationDornum, (a, b) => ({ x: a, y: b })).filter(el => !isNaN(el.y))
   });
   plotDataAllocation.push({
      id: "Emden (Summe Entry)",
      data: zipWith(xAchseAllocationEmdenOGE, yAchseSummeAllocationEmden, (a, b) => ({ x: a, y: b })).filter(el => !isNaN(el.y))
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

   if (
      !isEqual(xAchseFlowEmdenOGE, xAchseFlowEmdenGUD) ||
      !isEqual(xAchseFlowEmdenOGE, xAchseFlowEmdenGTS) ||
      !isEqual(xAchseFlowEmdenOGE, xAchseFlowEmdenTG) ||
      !isEqual(xAchseFlowEmdenOGE, xAchseFlowDornumOGE) ||
      !isEqual(xAchseFlowEmdenOGE, xAchseFlowDornumGUD) ||
      !isEqual(xAchseFlowEmdenOGE, xAchseFlowDornumGASPOOL) ||
      !isEqual(xAchseAllocationEmdenOGE, xAchseAllocationEmdenGUD) ||
      !isEqual(xAchseAllocationEmdenOGE, xAchseAllocationEmdenGTS) ||
      !isEqual(xAchseAllocationEmdenOGE, xAchseAllocationEmdenTG) ||
      !isEqual(xAchseAllocationEmdenOGE, xAchseAllocationDornumOGE) ||
      !isEqual(xAchseAllocationEmdenOGE, xAchseAllocationDornumGUD) ||
      !isEqual(xAchseAllocationEmdenOGE, xAchseAllocationDornumGASPOOL)
   )
      setTageVergangenheit(tageVergangenheit => tageVergangenheit + 1);

   console.log("Enddatum:", formatISO(subDays(new Date(), tageVergangenheit), { representation: "date" }));

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

const MyLine = ({ data, maxY, legendeLinks, einheitTooltip }) => {
   return (
      <Line
         theme={{
            fontSize: 11,
            axis: {
               legend: {
                  text: { fontSize: 12, fontWeight: "bold" }
               }
            },
            tooltip: {
               container: {
                  background: "#ffffff",
                  color: "#333333",
                  fontSize: 8
               },
               basic: {},
               chip: {},
               table: {},
               tableCell: {},
               tableCellValue: {}
            }
         }}
         data={data}
         colors={{ scheme: "nivo" }}
         xScale={{
            type: "time",
            format: "%Y-%m-%d",
            useUTC: false,
            precision: "day"
         }}
         xFormat="time:%Y-%m-%d"
         yScale={{
            type: "linear",
            min: 0,
            max: maxY
         }}
         // yFormat=" >-.3~r"
         yFormat={value =>
            `${Number(value).toLocaleString("de-DE", {
               maximumSignificantDigits: 3
            })} ${einheitTooltip}`
         }
         axisLeft={{
            legend: legendeLinks,
            legendOffset: -48,
            legendPosition: "middle"
         }}
         axisBottom={{
            format: "%d.%m.",
            tickValues: "every 1 week",
            legend: "Datum",
            legendOffset: 40,
            legendPosition: "middle"
         }}
         curve="monotoneX"
         pointSize={3}
         pointBorderWidth={1}
         pointBorderColor={{
            from: "color",
            modifiers: [["darker", 0.3]]
         }}
         useMesh={true}
         legends={[
            {
               anchor: "bottom-right",
               direction: "column",
               justify: false,
               translateX: 100,
               translateY: 0,
               itemsSpacing: 0,
               itemDirection: "left-to-right",
               itemWidth: 80,
               itemHeight: 20,
               itemOpacity: 0.75,
               symbolSize: 10,
               symbolShape: "circle",
               symbolBorderColor: "rgba(0, 0, 0, .5)"
            }
         ]}
         enableSlices="x"
         margin={{ top: 0, right: 175, bottom: 100, left: 60 }}
         width={900}
         height={500}
         animate={true}
      />
   );
};
