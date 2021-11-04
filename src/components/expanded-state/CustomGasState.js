import { useIsFocused, useRoute } from '@react-navigation/native';
import React, { useEffect, useState } from 'react';
import { useSharedValue, withSpring } from 'react-native-reanimated';
import { useSafeArea } from 'react-native-safe-area-context';
import Divider from '../Divider';
import { ExchangeHeader } from '../exchange';
import { FloatingPanel } from '../floating-panels';
import { GasSpeedButton } from '../gas';
import { Column } from '../layout';
import { SlackSheet } from '../sheet';
import { FeesPanel, FeesPanelTabs } from './custom-gas';
import { getTrendKey } from '@rainbow-me/helpers/gas';
import {
  useAccountSettings,
  useBooleanState,
  useColorForAsset,
  useDimensions,
  useGas,
  useHeight,
  useKeyboardHeight,
} from '@rainbow-me/hooks';
import { useNavigation } from '@rainbow-me/navigation';
import { colors, lightModeThemeColors } from '@rainbow-me/styles';

const springConfig = {
  damping: 500,
  mass: 3,
  stiffness: 1000,
};

const FOOTER_MIN_HEIGHT = 60;
const CONTENT_MIN_HEIGHT = 330;

function useAndroidDisableGesturesOnFocus() {
  const { params } = useRoute();
  const isFocused = useIsFocused();
  useEffect(() => {
    android && params?.toggleGestureEnabled?.(!isFocused);
  }, [isFocused, params]);
}

export default function CustomGasState({ asset }) {
  const { network } = useAccountSettings();
  const { setParams } = useNavigation();
  const { params: { longFormHeight } = {} } = useRoute();
  const { height: deviceHeight } = useDimensions();
  const keyboardHeight = useKeyboardHeight();
  const [isKeyboardVisible, showKeyboard, hideKeyboard] = useBooleanState();
  const insets = useSafeArea();
  const [footerHeight, setFooterHeight] = useHeight(FOOTER_MIN_HEIGHT);
  const [contentHeight, setContentHeight] = useHeight(CONTENT_MIN_HEIGHT);
  const contentScroll = useSharedValue(0);
  const colorForAsset = useColorForAsset(asset || {});
  const { selectedGasFee, currentBlockParams } = useGas();
  const [currentGasTrend] = useState(getTrendKey(currentBlockParams?.trend));
  useAndroidDisableGesturesOnFocus();

  const keyboardOffset = keyboardHeight + insets.bottom + 10;
  const sheetHeightWithoutKeyboard =
    contentHeight + footerHeight + (android ? 10 : 0);

  const sheetHeightWithKeyboard = sheetHeightWithoutKeyboard + keyboardHeight;

  const additionalScrollForKeyboard =
    sheetHeightWithoutKeyboard + keyboardOffset >
    deviceHeight - insets.top + insets.bottom
      ? deviceHeight -
        insets.top +
        insets.bottom -
        (sheetHeightWithoutKeyboard + keyboardOffset)
      : 0;

  // if ETH color, use blueApple
  const assetColor = useMemo(() => {
    if (colorForAsset === colors.brighten(lightModeThemeColors.dark)) {
      return colors.appleBlue;
    }
    return colorForAsset;
  }, [colorForAsset]);

  useEffect(() => {
    if (isKeyboardVisible) {
      contentScroll.value = withSpring(
        additionalScrollForKeyboard,
        springConfig
      );
      setParams({ longFormHeight: sheetHeightWithKeyboard });
    } else {
      contentScroll.value = withSpring(0, springConfig);
      setParams({ longFormHeight: sheetHeightWithoutKeyboard });
    }
  }, [
    additionalScrollForKeyboard,
    contentScroll,
    isKeyboardVisible,
    sheetHeightWithKeyboard,
    sheetHeightWithoutKeyboard,
    setParams,
  ]);
  return (
    <SlackSheet
      additionalTopPadding
      backgroundColor={colors.black}
      borderBottomRadius={0}
      borderRadius={39}
      contentHeight={longFormHeight}
      deviceHeight={deviceHeight}
      hideHandle
      removeTopPadding
      scrollEnabled={false}
    >
      <FloatingPanel onLayout={setContentHeight} radius={39}>
        <ExchangeHeader />
        <FeesPanel
          colorForAsset={assetColor}
          currentGasTrend={currentGasTrend}
          onCustomGasBlur={hideKeyboard}
          onCustomGasFocus={showKeyboard}
          selectedGasFee={selectedGasFee}
        />
        <Divider />
        <FeesPanelTabs
          colorForAsset={assetColor}
          onPressTabPill={hideKeyboard}
        />
      </FloatingPanel>
      <Column onLayout={setFooterHeight}>
        <GasSpeedButton
          asset={asset}
          currentNetwork={network}
          showGasOptions
          testID="swap-details-gas"
          theme="dark"
        />
      </Column>
    </SlackSheet>
  );
}