import { useState } from "react";

import { QueryClient, QueryClientProvider, useQueries } from "@tanstack/react-query";

import { Line } from "@nivo/line";

import axios from "axios";

import { subDays, formatISO } from "date-fns";

import MySwitch from "./UI/Switch";

const queryClient = new QueryClient({
   defaultOptions: {
      queries: {
         staleTime: 240 * 60 * 1000, // 240 Minuten = 4 Stunden
         cacheTime: 480 * 60 * 1000 // 480 Minuten = 8 Stunden
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

const heute = new Date().toISOString().slice(0, 10);

const axiosENTSOG = async (pointDirection, indicator) => {
   const jetzt = new Date();
   const gestern = subDays(jetzt, 1);

   const from = "2022-12-01";
   const to = formatISO(gestern, { representation: "date" });

   const { data } = await axios.get(
      `https://transparency.entsog.eu/api/v1/operationalData?limit=-1&cutPeriods=true&periodize=0&indicator=${indicator}&pointDirection=${pointDirection}&from=${from}&to=${to}&timezone=CET&periodType=day`
   );

   return data;
};

const punkteENTSOG = [
   // { id: "UK-TSO-0001ITP-00022entry", name: "St. Fergus" },
   // { id: "UK-TSO-0001ITP-00091entry", name: "Easington" },
   // { id: "be-tso-0001itp-00061entry", name: "Zeebrugge IZT" },
   // { id: "be-tso-0001itp-00061exit", name: "Zeebrugge IZT exit" },
   // { id: "uk-tso-0004itp-00207entry", name: "Bacton (BBL) entry" },
   // { id: "uk-tso-0004itp-00207exit", name: "Bacton (BBL) (Exit)" },
   // { id: "FR-TSO-0003ITP-00045entry", name: "Dunkerque" },
   // { id: "BE-TSO-0001ITP-00106entry", name: "Zeebrugge ZPT" },

   { id: "DE-TSO-0009ITP-00080entry", name: "Emden (EPT1) (OGE) (\u2192 DE)" }, // = Uwe
   { id: "DE-TSO-0005ITP-00081entry", name: "Emden (EPT1) (GUD) (\u2192 DE)" }, // = Uwe
   { id: "NL-TSO-0001ITP-00160entry", name: "Emden (EPT1) (GTS) (\u2192 NL)" }, // = Uwe
   { id: "DE-TSO-0002ITP-00105entry", name: "Emden (EPT1) (Thyssengas) (\u2192 DE)" },
   // { id: "DE-TSO-0005ITP-00086entry", name: "Emden (NPT) (GUD) (\u2192 DE)" }, // "No Data Available"
   // { id: "NL-TSO-0001ITP-00161entry", name: "Emden (NPT) (GTS) (\u2192 NL)" }, // "No Data Available"
   // { id: "DE-TSO-0002ITP-00075entry", name: "Emden (NPT) (Thyssengas) (\u2192 DE)" }, // "No Data Available"
   { id: "DE-TSO-0009ITP-00126entry", name: "Dornum / NETRA (OGE) (\u2192 DE)" }, // = Uwe
   { id: "DE-TSO-0005ITP-00188entry", name: "Dornum / NETRA (GUD) (\u2192 DE)" },
   // { id: "DE-TSO-0013ITP-00211entry", name: "Dornum / NETRA (jordgas Transport) (\u2192 DE)" }, // "No Data Available"
   { id: "DE-TSO-0009ITP-00525entry", name: "Dornum GASPOOL (\u2192 DE)" },
   { id: "DK-TSO-0001ITP-00097entry", name: "Nybro (\u2192 DK)" },
   { id: "de-tso-0001itp-00096exit", name: "Mallnow (\u2192 PL)" }
];

const Plot = () => {
   const [allocation, setAllocation] = useState(false);

   const resultsFlow = useQueries({
      queries: punkteENTSOG.map(el => ({ queryKey: [el.id, "Physical+Flow"], queryFn: () => axiosENTSOG(el.id, "Physical+Flow") }))
   });

   const resultsAllocation = useQueries({
      queries: punkteENTSOG.map(el => ({ queryKey: [el.id, "Allocation"], queryFn: () => axiosENTSOG(el.id, "Allocation") }))
   });

   const isLoading = resultsFlow.some(el => el.isLoading) || resultsAllocation.some(el => el.isLoading);
   const isError = resultsFlow.some(el => el.isError) || resultsAllocation.some(el => el.isError);

   if (isLoading) return <div>Loading...</div>;
   if (isError) return <div>Fehler beim Laden!</div>;

   const plotDataFlow = resultsFlow.map(el => ({
      id: punkteENTSOG.find(p => p.id === el.data.meta.query.pointDirection).name,
      data: el.data.operationalData.map(d => ({
         x: d.periodFrom.slice(0, 10),
         y: d.value > 1000000 ? Math.round(d.value / 1000000) : Math.round(d.value / 1000) / 1000
      }))
   }));

   const plotDataAllocation = resultsAllocation.map(el => ({
      id: punkteENTSOG.find(p => p.id === el.data.meta.query.pointDirection).name,
      data: el.data.operationalData.map(d => ({
         x: d.periodFrom.slice(0, 10),
         y: d.value > 1000000 ? Math.round(d.value / 1000000) : Math.round(d.value / 1000) / 1000
      }))
   }));

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
         fontSize: 9,
         axis: {
            legend: {
               text: { fontSize: 9 }
            }
         },
         tooltip: {
            container: {
               background: "#ffffff",
               color: "#333333",
               fontSize: 9
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
         format: "%d. %b",
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
      margin={{ top: 0, right: 180, bottom: 100, left: 60 }}
      width={1000}
      height={500}
      animate={true}
      // enableSlices={false}
   />
);
