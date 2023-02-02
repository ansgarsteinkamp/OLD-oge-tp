import { useState } from "react";

import { QueryClient, QueryClientProvider, useQueries } from "@tanstack/react-query";

import { Line } from "@nivo/line";

import axios from "axios";

import { subDays, formatISO } from "date-fns";
import isEqual from "lodash/head.js";
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

const axiosENTSOG = async (id, type) => {
   // id: "DE-TSO-0009ITP-00080entry"
   // type: "Physical+Flow" bzw. "Allocation"

   const jetzt = new Date();

   const from = "2022-11-01";
   const to = formatISO(subDays(jetzt, 1), { representation: "date" });

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
   { id: "dk-tso-0001itp-00630entry", name: "Nybro (NO \u2192 PL)" },
   { id: "de-tso-0001itp-00096exit", name: "Mallnow (D \u2192 PL)" }
];

const Plot = () => {
   const [allocation, setAllocation] = useState(false);

   const resultsFlow = useQueries({
      queries: punkte.map(el => ({ queryKey: [el.id, "Physical+Flow"], queryFn: () => axiosENTSOG(el.id, "Physical+Flow") }))
   });

   const resultsAllocation = useQueries({
      queries: punkte.map(el => ({ queryKey: [el.id, "Allocation"], queryFn: () => axiosENTSOG(el.id, "Allocation") }))
   });

   const isLoading = resultsFlow.some(el => el.isLoading) || resultsAllocation.some(el => el.isLoading);
   const isError = resultsFlow.some(el => el.isError) || resultsAllocation.some(el => el.isError);

   if (isLoading) return <div>Loading...</div>;
   if (isError) return <div>Fehler beim Laden!</div>;

   const plotDataFlow = resultsFlow.map(el => ({
      id: punkte.find(p => p.id === el.data.meta.query.pointDirection).name,
      data: el.data.operationalData.map(d => ({
         x: d.periodFrom.slice(0, 10),
         y: d.value > 1000000 ? Math.round(d.value / 1000000) : Math.round(d.value / 1000) / 1000
      }))
   }));

   const xAchseFlowEmdenOGE = plotDataFlow.find(el => el.id === "Emden OGE").data.map(el => el.x);
   const xAchseFlowEmdenGUD = plotDataFlow.find(el => el.id === "Emden GUD").data.map(el => el.x);
   const xAchseFlowEmdenGTS = plotDataFlow.find(el => el.id === "Emden GTS").data.map(el => el.x);
   const xAchseFlowEmdenTG = plotDataFlow.find(el => el.id === "Emden TG").data.map(el => el.x);
   const xAchseFlowDornumOGE = plotDataFlow.find(el => el.id === "Dornum OGE").data.map(el => el.x);
   const xAchseFlowDornumGUD = plotDataFlow.find(el => el.id === "Dornum GUD").data.map(el => el.x);
   const xAchseFlowDornumGASPOOL = plotDataFlow.find(el => el.id === "Dornum GASPOOL").data.map(el => el.x);

   if (
      !isEqual(xAchseFlowEmdenOGE, xAchseFlowEmdenGUD) ||
      !isEqual(xAchseFlowEmdenOGE, xAchseFlowEmdenGTS) ||
      !isEqual(xAchseFlowEmdenOGE, xAchseFlowEmdenTG) ||
      !isEqual(xAchseFlowEmdenOGE, xAchseFlowDornumOGE) ||
      !isEqual(xAchseFlowEmdenOGE, xAchseFlowDornumGUD) ||
      !isEqual(xAchseFlowEmdenOGE, xAchseFlowDornumGASPOOL)
   )
      return <div>Fehler der Zeitachsen Physical Flow</div>;

   const yAchseFlowEmdenOGE = plotDataFlow.find(el => el.id === "Emden OGE").data.map(el => el.y);
   const yAchseFlowEmdenGUD = plotDataFlow.find(el => el.id === "Emden GUD").data.map(el => el.y);
   const yAchseFlowEmdenGTS = plotDataFlow.find(el => el.id === "Emden GTS").data.map(el => el.y);
   // const yAchseFlowEmdenTG = plotDataFlow.find(el => el.id === "Emden TG").data.map(el => el.y);
   const yAchseFlowDornumOGE = plotDataFlow.find(el => el.id === "Dornum OGE").data.map(el => el.y);
   // const yAchseFlowDornumGUD = plotDataFlow.find(el => el.id === "Dornum GUD").data.map(el => el.y);
   // const yAchseFlowDornumGASPOOL = plotDataFlow.find(el => el.id === "Dornum GASPOOL").data.map(el => el.y);

   const yAchseSummeFlowEmden = zipWith(yAchseFlowEmdenOGE, yAchseFlowEmdenGUD, yAchseFlowEmdenGTS, (a, b, c) => a + b + c);
   const yAchseSummeFlowDornum = yAchseFlowDornumOGE;

   plotDataFlow.push({ id: "Emden (Summe Entry)", data: zipWith(xAchseFlowEmdenOGE, yAchseSummeFlowEmden, (a, b) => ({ x: a, y: b })) });
   plotDataFlow.push({ id: "Dornum (Summe Entry)", data: zipWith(xAchseFlowDornumOGE, yAchseSummeFlowDornum, (a, b) => ({ x: a, y: b })) });

   const plotDataAllocation = resultsAllocation.map(el => ({
      id: punkte.find(p => p.id === el.data.meta.query.pointDirection).name,
      data: el.data.operationalData.map(d => ({
         x: d.periodFrom.slice(0, 10),
         y: d.value > 1000000 ? Math.round(d.value / 1000000) : Math.round(d.value / 1000) / 1000
      }))
   }));

   const xAchseAllocationEmdenOGE = plotDataAllocation.find(el => el.id === "Emden OGE").data.map(el => el.x);
   const xAchseAllocationEmdenGUD = plotDataAllocation.find(el => el.id === "Emden GUD").data.map(el => el.x);
   const xAchseAllocationEmdenGTS = plotDataAllocation.find(el => el.id === "Emden GTS").data.map(el => el.x);
   const xAchseAllocationEmdenTG = plotDataAllocation.find(el => el.id === "Emden TG").data.map(el => el.x);
   const xAchseAllocationDornumOGE = plotDataAllocation.find(el => el.id === "Dornum OGE").data.map(el => el.x);
   const xAchseAllocationDornumGUD = plotDataAllocation.find(el => el.id === "Dornum GUD").data.map(el => el.x);
   const xAchseAllocationDornumGASPOOL = plotDataAllocation.find(el => el.id === "Dornum GASPOOL").data.map(el => el.x);

   if (
      !isEqual(xAchseAllocationEmdenOGE, xAchseAllocationEmdenGUD) ||
      !isEqual(xAchseAllocationEmdenOGE, xAchseAllocationEmdenGTS) ||
      !isEqual(xAchseAllocationEmdenOGE, xAchseAllocationEmdenTG) ||
      !isEqual(xAchseAllocationEmdenOGE, xAchseAllocationDornumOGE) ||
      !isEqual(xAchseAllocationEmdenOGE, xAchseAllocationDornumGUD) ||
      !isEqual(xAchseAllocationEmdenOGE, xAchseAllocationDornumGASPOOL)
   )
      return <div>Fehler der Zeitachsen Allocation</div>;

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
      id: "Emden (Summe Entry)",
      data: zipWith(xAchseAllocationEmdenOGE, yAchseSummeAllocationEmden, (a, b) => ({ x: a, y: b })).filter(el => !isNaN(el.y))
   });
   plotDataAllocation.push({
      id: "Dornum (Summe Entry)",
      data: zipWith(xAchseAllocationDornumOGE, yAchseSummeAllocationDornum, (a, b) => ({ x: a, y: b })).filter(el => !isNaN(el.y))
   });

   return (
      <div className="flex justify-center mt-10">
         <div>
            <div className="ml-9 mb-5 space-y-1">
               <h1>ENTSOG Transparency Platform</h1>
               <div className="flex space-x-2 text-xs items-center">
                  <p>Physical Flow</p>
                  <MySwitch allocation={allocation} setAllocation={setAllocation} />
                  <p>Allocation</p>
               </div>
            </div>
            {!allocation && <MyLine data={plotDataFlow} />}
            {allocation && <MyLine data={plotDataAllocation} myLegendLeft={"Allocation [GWh/d]"} />}
         </div>
      </div>
   );
};

const MyLine = ({ data, myLegendLeft = "Physical Flow [GWh/d]" }) => (
   <Line
      theme={{
         fontSize: 10,
         axis: {
            legend: {
               text: { fontSize: 11 }
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
      colors={{ scheme: "paired" }}
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
         max: "auto"
      }}
      axisLeft={{
         legend: myLegendLeft,
         legendOffset: -50,
         legendPosition: "middle"
      }}
      axisBottom={{
         format: "%d.%m.",
         tickValues: "every 1 week"
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
            symbolSize: 8,
            symbolShape: "circle",
            symbolBorderColor: "rgba(0, 0, 0, .5)"
         }
      ]}
      enableSlices="x"
      margin={{ top: 0, right: 200, bottom: 100, left: 60 }}
      width={1000}
      height={500}
      animate={true}
      // enableSlices={false}
   />
);
