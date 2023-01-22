import { QueryClient, QueryClientProvider, useQuery } from "@tanstack/react-query";

import { ResponsiveLine } from "@nivo/line";

import axios from "axios";

const queryClient = new QueryClient();

export default function App() {
   return (
      <QueryClientProvider client={queryClient}>
         <Example />
      </QueryClientProvider>
   );
}

const plotData = [
   {
      id: "Daten ENTSOG",
      color: "hsl(100, 70%, 50%)",
      data: [
         {
            x: "plane",
            y: 126
         },
         {
            x: "helicopter",
            y: 83
         },
         {
            x: "boat",
            y: 278
         },
         {
            x: "train",
            y: 97
         },
         {
            x: "subway",
            y: 167
         },
         {
            x: "bus",
            y: 79
         },
         {
            x: "car",
            y: 261
         },
         {
            x: "moto",
            y: 11
         },
         {
            x: "bicycle",
            y: 4
         },
         {
            x: "horse",
            y: 103
         },
         {
            x: "skateboard",
            y: 44
         },
         {
            x: "others",
            y: 166
         }
      ]
   }
];

function Example() {
   const { isLoading, error, data, isFetching } = useQuery({
      queryKey: ["repoData"],
      queryFn: () =>
         axios
            .get(
               "https://transparency.entsog.eu/api/v1/operationalData?limit=-1&indicator=Physical+Flow&periodType=day&pointDirection=LT-TSO-0001ITP-00050exit&from=2022-12-30&to=2023-01-20&timezone=CEST"
            )
            .then(res => res.data)
   });

   if (isLoading) return "Loading...";

   if (error) return "An error has occurred: " + error.message;

   const plotData = [
      {
         id: "ENTSOG",
         color: "hsl(100, 70%, 50%)",
         data: data.operationalData.map(el => ({ x: el.periodFrom.slice(0, 10), y: el.value / 1000 }))
      }
   ];

   return (
      <div className="flex items-center justify-center min-h-screen">
         <div className="h-96 w-1/2">
            <MyResponsiveLine data={plotData} />
         </div>
      </div>
   );
}

const MyResponsiveLine = ({ data /* see data tab */ }) => (
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
