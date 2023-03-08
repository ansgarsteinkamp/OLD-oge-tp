import { Line } from "@nivo/line";

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
            format: "%d.%m.%Y",
            tickValues: "every 1 month",
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
         margin={{ top: 0, right: 200, bottom: 100, left: 60 }}
         width={900}
         height={500}
         animate={true}
      />
   );
};

export default MyLine;
