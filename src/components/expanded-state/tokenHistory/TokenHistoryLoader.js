import React from 'react';
import { View } from 'react-native';
import RadialGradient from 'react-native-radial-gradient';
import styled from 'styled-components';
import { Column, Row } from '../../layout';
import { useDimensions } from '@rainbow-me/hooks';

const Container = styled(Row)`
  width: ${({ width }) => width};
  height: 57;
  background-color: #ffffff00;
`;

const FakeDate = styled(RadialGradient).attrs(({ theme: { colors } }) => ({
  center: [0, 0],
  colors: [colors.whiteLabel, '#FFFFFF00'],
}))`
  border-radius: 5;
  width: 60;
  height: 11;
  overflow: hidden;
  opacity: 0.1;
  margin-bottom: 9;
`;

const FakeEvent = styled(RadialGradient).attrs(({ theme: { colors } }) => ({
  center: [0, 0],
  colors: [colors.whiteLabel, '#FFFFFF00'],
}))`
  border-radius: 5;
  width: 130;
  height: 11;
  overflow: hidden;
  opacity: 0.1;
`;

const LeftmostEvent = styled(RadialGradient).attrs(({ theme: { colors } }) => ({
  center: [0, 0],
  colors: [colors.whiteLabel, '#FFFFFF00'],
}))`
  border-radius: 5;
  width: 39;
  height: 11;
  opacity: 0.1;
`;

const LeftmostLine = styled(View)`
  height: 3;
  background-color: #ffffff;
  opacity: 0.1;
  border-radius: 1.5;
  width: 76;
  margin-bottom: 32.5;
  margin-top: 3.5;
`;

const Line = styled(View)`
  height: 3;
  background-color: #ffffff;
  opacity: 0.1;
  border-radius: 1.5;
  width: 132;
  margin-top: 3.5;
`;

const RowWithMargins = styled(Row)`
  margin-left: 6;
`;

const Gradient = styled(RadialGradient).attrs(({ theme: { colors } }) => ({
  center: [0, 0],
  colors: [
    colors.alpha(colors.whiteLabel, 0.2),
    colors.alpha(colors.whiteLabel, 0.06),
  ],
  radius: 10,
}))`
  border-radius: 5;
  width: 10;
  height: 10;
  margin-left: 6;
  margin-right: 6;
  margin-bottom: 9;
  overflow: hidden;
`;

export default function TokenHistoryLoader() {
  const { width } = useDimensions();
  const { colors } = useTheme();
  return (
    <Container colors={colors} width={width}>
      <Column>
        <LeftmostLine />
        <LeftmostEvent colors={colors} />
      </Column>

      <Column>
        <Row>
          <Gradient colors={colors} />
          <Line />
        </Row>

        <RowWithMargins>
          <FakeDate colors={colors} />
        </RowWithMargins>

        <RowWithMargins>
          <FakeEvent colors={colors} />
        </RowWithMargins>
      </Column>

      <Column>
        <Row>
          <Gradient colors={colors} />
        </Row>
        <RowWithMargins>
          <FakeDate colors={colors} />
        </RowWithMargins>

        <RowWithMargins>
          <FakeEvent colors={colors} />
        </RowWithMargins>
      </Column>
    </Container>
  );
}
