import Svg, { Circle, G } from "react-native-svg";
import { Text, View } from "react-native";
import { colors } from "../theme";

const palette = [colors.blue, colors.green, colors.yellow, colors.teal, colors.red];

export function DonutChart({ data }: { data: Array<{ label: string; value: number }> }) {
  const total = data.reduce((sum, item) => sum + item.value, 0) || 1;
  const radius = 68;
  const stroke = 28;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;

  return (
    <View style={{ alignItems: "center", justifyContent: "center", paddingVertical: 18 }}>
      <Svg width={190} height={190} viewBox="0 0 190 190">
        <G rotation="-90" origin="95,95">
          {data.map((item, index) => {
            const length = (item.value / total) * circumference;
            const circle = (
              <Circle
                key={item.label}
                cx={95}
                cy={95}
                r={radius}
                stroke={palette[index % palette.length]}
                strokeWidth={stroke}
                strokeDasharray={`${length} ${circumference - length}`}
                strokeDashoffset={-offset}
                fill="transparent"
              />
            );
            offset += length;
            return circle;
          })}
        </G>
      </Svg>
      <View style={{ position: "absolute", width: 72, height: 72, borderRadius: 36, backgroundColor: colors.surface, alignItems: "center", justifyContent: "center" }}>
        <Text style={{ color: colors.text, fontWeight: "800" }}>{Math.round(total)}</Text>
        <Text style={{ color: colors.muted, fontSize: 10 }}>spent</Text>
      </View>
    </View>
  );
}
