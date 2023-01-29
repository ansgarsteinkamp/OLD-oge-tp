import { useState } from "react";

import { QueryClient, QueryClientProvider, useQueries } from "@tanstack/react-query";

import { ResponsiveLine, Line } from "@nivo/line";

import axios from "axios";

import MySwitch from "./UI/Switch";

const queryClient = new QueryClient({
   defaultOptions: {
      queries: {
         staleTime: 120 * 60 * 1000, // 120 Minuten
         cacheTime: 240 * 60 * 1000 // 240 Minuten
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
   const { data } = await axios.get(
      `https://transparency.entsog.eu/api/v1/operationalData?limit=-1&indicator=${indicator}&periodType=day&pointDirection=${pointDirection}&from=2022-12-01&to=${heute}&timezone=CEST`
   );
   return data;
};

const punkte = [
   { id: "UK-TSO-0001ITP-00022entry", name: "St. Fergus" },
   { id: "UK-TSO-0001ITP-00091entry", name: "Easington" },
   { id: "be-tso-0001itp-00061entry", name: "Zeebrugge IZT" },
   // { id: "be-tso-0001itp-00061exit", name: "Zeebrugge IZT exit" },
   // { id: "uk-tso-0004itp-00207entry", name: "Bacton (BBL) entry" },
   { id: "uk-tso-0004itp-00207exit", name: "Bacton (BBL) (Exit)" },
   { id: "FR-TSO-0003ITP-00045entry", name: "Dunkerque" },
   { id: "BE-TSO-0001ITP-00106entry", name: "Zeebrugge ZPT" },
   { id: "NL-TSO-0001ITP-00160entry", name: "Emden (EPT1) (GTS)" },
   { id: "DE-TSO-0009ITP-00080entry", name: "Emden (EPT1) (OGE)" },
   { id: "DE-TSO-0005ITP-00081entry", name: "Emden (EPT1) (GUD)" },
   { id: "DE-TSO-0009ITP-00126entry", name: "Dornum / NETRA (OGE)" }
];

const Plot = () => {
   const [allocation, setAllocation] = useState(false);

   const indicator = allocation ? "Allocation" : "Physical+Flow";

   console.log(allocation);

   const results = useQueries({
      queries: punkte.map(el => ({ queryKey: [el.id, indicator], queryFn: () => axiosENTSOG(el.id, indicator) }))
   });

   const isLoading = results.some(el => el.isLoading);
   const isError = results.some(el => el.isError);

   if (isLoading) return <div>Loading...</div>;
   if (isError) return <div>Fehler beim Laden!</div>;

   const plotData = results.map(el => ({
      id: punkte.find(p => p.id === el.data.meta.query.pointDirection).name,
      data: el.data.operationalData.map(d => ({
         x: d.periodFrom.slice(0, 10),
         y: d.value > 1000000 ? Math.round(d.value / 1000000) : Math.round(d.value / 1000) / 1000
      }))
   }));

   // console.log(plotData);

   return (
      <div className="flex justify-center mt-10">
         <div>
            <div className="ml-9 mb-5 space-y-1">
               <h1>ENTSOG Transparency Platform</h1>
               <div className="flex space-x-2 text-xs items-center">
                  <MySwitch allocation={allocation} setAllocation={setAllocation} />
                  <p>Allocation (statt Physical Flow)</p>
               </div>
            </div>
            <MyLine data={plotData} />
         </div>
      </div>
   );
};

const MyLine = ({ data }) => (
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
         legend: "Physical Flow [GWh/d]",
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

const MyResponsiveLine = ({ data }) => (
   <ResponsiveLine
      data={data}
      margin={{ top: 50, right: 110, bottom: 100, left: 60 }}
      xScale={{ type: "point" }}
      yScale={{
         type: "linear",
         min: 0,
         max: "auto",
         stacked: true,
         reverse: false
      }}
      yFormat=" >-.2f"
      axisTop={null}
      axisRight={null}
      axisBottom={{
         orient: "bottom",
         tickSize: 5,
         tickPadding: 5,
         tickRotation: -45,
         legend: "",
         legendOffset: 36,
         legendPosition: "middle"
      }}
      axisLeft={{
         orient: "left",
         tickSize: 5,
         tickPadding: 5,
         tickRotation: 0,
         legend: "MWh/d",
         legendOffset: -50,
         legendPosition: "middle"
      }}
      pointColor={{ from: "color", modifiers: [] }}
      pointBorderWidth={2}
      pointBorderColor={{ from: "serieColor" }}
      pointLabelYOffset={-12}
      enableArea={true}
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
            symbolSize: 12,
            symbolShape: "circle",
            symbolBorderColor: "rgba(0, 0, 0, .5)",
            effects: [
               {
                  on: "hover",
                  style: {
                     itemBackground: "rgba(0, 0, 0, .03)",
                     itemOpacity: 1
                  }
               }
            ]
         }
      ]}
   />
);
