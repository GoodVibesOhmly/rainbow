import AnimateNumber from '@bankify/react-native-animate-number';
import { get, isEmpty, isNil, lowerCase, upperFirst } from 'lodash';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Keyboard } from 'react-native';
import { ContextMenuButton } from 'react-native-ios-context-menu';
import styled from 'styled-components';
import { darkModeThemeColors, lightModeThemeColors } from '../../styles/colors';
import { ButtonPressAnimation } from '../animations';
import { ChainBadge, CoinIcon } from '../coin-icon';
import { Column, Row } from '../layout';
import { Text } from '../text';
import GasSpeedLabelPager from './GasSpeedLabelPager';
import { isL2Network } from '@rainbow-me/handlers/web3';
import networkTypes from '@rainbow-me/helpers/networkTypes';
import {
  useAccountSettings,
  useColorForAsset,
  useGas,
  usePrevious,
} from '@rainbow-me/hooks';
import { useNavigation } from '@rainbow-me/navigation';
import { ETH_ADDRESS, MATIC_POLYGON_ADDRESS } from '@rainbow-me/references';
import Routes from '@rainbow-me/routes';
import { margin, padding } from '@rainbow-me/styles';
import {
  gasUtils,
  magicMemo,
  showActionSheetWithOptions,
} from '@rainbow-me/utils';

const { GAS_ICONS, GasSpeedOrder, CUSTOM, URGENT, NORMAL, FAST } = gasUtils;

const CustomGasButton = styled(ButtonPressAnimation).attrs({
  alignItems: 'center',
  hapticType: 'impactHeavy',
  height: 30,
  justifyContent: 'center',
  scaleTo: 0.9,
})`
  border: ${({ borderColor, color, theme: { colors } }) =>
    `2px solid ${borderColor || color || colors.blueGreyDark}`};
  border-radius: 19px;
  ${margin(0, 0, 0, 8)}
  ${padding(0, 0, 0, 0)}
`;

const Symbol = styled(Text).attrs({
  alignItems: 'center',
  flex: 1,
  size: 'lmedium',
  weight: 'heavy',
})`
  ${margin(0, 8, 0, 8)}
`;

const DoneCustomGas = styled(Text).attrs({
  alignItems: 'center',
  justifyContent: 'center',
  size: 'lmedium',
  weight: 'heavy',
})`
  ${padding(0, 0, 0, 0)}
  ${margin(0, 10, 0, 10)}
`;

const ChainBadgeContainer = styled.View.attrs({
  hapticType: 'impactHeavy',
  scaleTo: 0.9,
})`
  ${padding(0, 0)};
  ${margin(0, 0, 0, 8)};
`;

const NativeCoinIconWrapper = styled(Column)`
  ${margin(android ? 5 : 0, 5, 0, 0)};
`;

const Container = styled(Column).attrs({
  alignItems: 'center',
  hapticType: 'impactHeavy',
  justifyContent: 'center',
})`
  ${margin(19, 0)};
  ${({ horizontalPadding }) => padding(0, horizontalPadding)};
  width: 100%;
`;

const Label = styled(Text).attrs(({ size, weight }) => ({
  size: size || 'lmedium',
  weight: weight || 'semibold',
}))``;

const TransactionTimeLabel = ({ formatter, theme }) => {
  const { colors } = useTheme();
  return (
    <Label
      align="right"
      color={
        theme === 'dark'
          ? colors.alpha(darkModeThemeColors.blueGreyDark, 0.6)
          : colors.alpha(colors.blueGreyDark, 0.6)
      }
      size="lmedium"
      weight="bold"
    >
      {formatter()}
    </Label>
  );
};

const GasSpeedButton = ({
  showGasOptions = false,
  testID,
  theme = 'dark',
  options = null,
  currentNetwork,
  asset,
  horizontalPadding = 20,
}) => {
  const { colors } = useTheme();
  const { navigate, goBack } = useNavigation();
  const { nativeCurrencySymbol, nativeCurrency } = useAccountSettings();
  const colorForAsset = useColorForAsset(asset || {});

  // if ETH color, use blueApple
  const assetColor = useMemo(() => {
    if (colorForAsset === colors.brighten(lightModeThemeColors.dark)) {
      return colors.appleBlue;
    }
    return colorForAsset;
  }, [colorForAsset, colors]);

  const {
    gasFeeParamsBySpeed,
    gasFeesBySpeed,
    isSufficientGas,
    updateGasFeeOption,
    selectedGasFee,
    selectedGasFeeOption,
  } = useGas();

  const [estimatedTimeValue, setEstimatedTimeValue] = useState(0);
  const [estimatedTimeUnit, setEstimatedTimeUnit] = useState('min');
  const [inputFocused] = useState(false);
  const [shouldOpenCustomGasSheet, setShouldOpenCustomGasSheet] = useState(
    false
  );
  const prevShouldOpenCustomGasSheet = usePrevious(shouldOpenCustomGasSheet);

  // Because of the animated number component
  // we need to trim the native currency symbol
  // (and leave the number only!)
  // which gets added later in the formatGasPrice function
  const price = useMemo(() => {
    const gasPrice = get(
      selectedGasFee,
      `gasFee.estimatedFee.native.value.display`
    );
    const price = (isNil(gasPrice) ? '0.00' : gasPrice)
      .replace(',', '') // In case gas price is > 1k!
      .replace(nativeCurrencySymbol, '')
      .trim();
    return price;
  }, [nativeCurrencySymbol, selectedGasFee]);

  const isL2 = useMemo(() => isL2Network(currentNetwork), [currentNetwork]);

  const formatGasPrice = useCallback(
    animatedValue => {
      // L2's are very cheap,
      // so let's default to the last 2 significant decimals
      if (isL2) {
        const numAnimatedValue = Number.parseFloat(animatedValue);
        if (numAnimatedValue < 0.01) {
          return `${nativeCurrencySymbol}${numAnimatedValue.toPrecision(2)}`;
        } else {
          return `${nativeCurrencySymbol}${numAnimatedValue.toFixed(2)}`;
        }
      } else {
        return `${nativeCurrencySymbol}${
          nativeCurrency === 'ETH'
            ? (Math.ceil(Number(animatedValue) * 10000) / 10000).toFixed(4)
            : (Math.ceil(Number(animatedValue) * 100) / 100).toFixed(2)
        }`;
      }
    },
    [isL2, nativeCurrencySymbol, nativeCurrency]
  );

  const gasIsNotReady = useMemo(
    () =>
      isEmpty(gasFeeParamsBySpeed) ||
      isEmpty(selectedGasFee?.gasFee) ||
      typeof isSufficientGas === 'undefined',
    [gasFeeParamsBySpeed, selectedGasFee?.gasFee, isSufficientGas]
  );

  const openCustomGasSheet = useCallback(() => {
    if (gasIsNotReady) return;
    navigate(Routes.CUSTOM_GAS_SHEET, {
      asset,
      type: 'custom_gas',
    });
  }, [asset, navigate, gasIsNotReady]);

  const openCustomOptions = useCallback(() => {
    Keyboard.dismiss();
    setShouldOpenCustomGasSheet(true);
  }, [setShouldOpenCustomGasSheet]);

  const renderGasPriceText = useCallback(
    animatedNumber => (
      <Text
        color={
          theme === 'dark'
            ? colors.whiteLabel
            : colors.alpha(colors.blueGreyDark, 0.8)
        }
        letterSpacing="roundedTight"
        size="lmedium"
        weight="bold"
      >
        {gasIsNotReady ? 'Loading...' : animatedNumber}
      </Text>
    ),
    [theme, colors, gasIsNotReady]
  );

  const handlePressSpeedOption = useCallback(
    selectedSpeed => {
      if (inputFocused) {
        return;
      }
      updateGasFeeOption(selectedSpeed);
    },
    [inputFocused, updateGasFeeOption]
  );

  const formatTransactionTime = useCallback(() => {
    const time = parseFloat(estimatedTimeValue || 0).toFixed(0);
    let selectedGasFeeGwei = get(
      selectedGasFee,
      'estimatedFee.value.display.display'
    );
    if (selectedGasFeeGwei === '0 Gwei') {
      selectedGasFeeGwei = '< 1 Gwei';
    }
    let timeSymbol = '~';

    if (selectedGasFeeOption === CUSTOM) {
      const customWei = get(
        gasFeesBySpeed,
        `${CUSTOM}.estimatedFee.value.amount`
      );
      if (customWei) {
        const normalWei = get(
          gasFeesBySpeed,
          `${NORMAL}.estimatedFee.value.amount`
        );
        const urgentWei = get(
          gasFeesBySpeed,
          `${URGENT}.estimatedFee.value.amount`
        );
        const minGasPriceSlow = normalWei | urgentWei;
        const maxGasPriceFast = urgentWei;
        if (normalWei < minGasPriceSlow) {
          timeSymbol = '>';
        } else if (normalWei > maxGasPriceFast) {
          timeSymbol = '<';
        }

        return ` ${timeSymbol}${time} ${estimatedTimeUnit}`;
      } else {
        return ``;
      }
    }

    // If it's still loading show `...`
    if (time === '0' && estimatedTimeUnit === 'min') {
      return ``;
    }

    return ` ${timeSymbol}${time} ${estimatedTimeUnit}`;
  }, [
    estimatedTimeUnit,
    estimatedTimeValue,
    gasFeesBySpeed,
    selectedGasFee,
    selectedGasFeeOption,
  ]);

  const openGasHelper = useCallback(
    () => navigate(Routes.EXPLAIN_SHEET, { type: 'gas' }),
    [navigate]
  );

  const handlePressMenuItem = useCallback(
    ({ nativeEvent: { actionKey } }) => {
      handlePressSpeedOption(actionKey);
    },
    [handlePressSpeedOption]
  );

  const nativeFeeCurrencySymbol = useMemo(() => {
    switch (currentNetwork) {
      case networkTypes.polygon:
        return { address: MATIC_POLYGON_ADDRESS, symbol: 'MATIC' };
      case networkTypes.optimism:
      case networkTypes.arbitrum:
      default:
        return { address: ETH_ADDRESS, symbol: 'ETH' };
    }
  }, [currentNetwork]);

  const speedOptions = useMemo(() => {
    if (options) return options;
    switch (currentNetwork) {
      case networkTypes.polygon:
        return [NORMAL, FAST, URGENT];
      case networkTypes.optimism:
      case networkTypes.arbitrum:
        return ['normal'];
      default:
        return GasSpeedOrder;
    }
  }, [currentNetwork, options]);

  const menuConfig = useMemo(() => {
    const menuOptions = speedOptions.map(gasOption => ({
      actionKey: gasOption,
      actionTitle: upperFirst(gasOption),
      icon: {
        iconType: 'ASSET',
        iconValue: GAS_ICONS[gasOption],
      },
    }));
    return {
      menuItems: menuOptions,
      menuTitle: `Transaction Speed`,
    };
  }, [speedOptions]);

  const gasOptionsAvailable = useMemo(() => speedOptions.length > 1, [
    speedOptions,
  ]);

  const onDonePress = useCallback(() => {
    goBack();
  }, [goBack]);

  const onPressAndroid = useCallback(() => {
    if (gasIsNotReady) return;
    const uppercasedSpeedOptions = speedOptions.map(speed => upperFirst(speed));
    const androidContractActions = [...uppercasedSpeedOptions, 'Cancel'];

    showActionSheetWithOptions(
      {
        cancelButtonIndex: androidContractActions.length,
        options: androidContractActions,
        showSeparators: true,
        title: `Transaction Speed`,
      },
      idx => {
        if (idx !== androidContractActions) {
          handlePressSpeedOption(lowerCase(androidContractActions[idx]));
        }
      }
    );
  }, [gasIsNotReady, speedOptions, handlePressSpeedOption]);

  const renderGasSpeedPager = useMemo(() => {
    if (showGasOptions) return;
    const pager = (
      <GasSpeedLabelPager
        colorForAsset={
          gasOptionsAvailable
            ? assetColor
            : colors.alpha(colors.blueGreyDark, 0.4)
        }
        currentNetwork={currentNetwork}
        dropdownEnabled={gasOptionsAvailable}
        label={selectedGasFeeOption}
        showGasOptions={showGasOptions}
        showPager={!inputFocused}
        theme={theme}
      />
    );
    if (!gasOptionsAvailable || gasIsNotReady) return pager;
    return (
      <ContextMenuButton
        activeOpacity={0}
        enableContextMenu
        menuConfig={menuConfig}
        {...(android ? { onPress: onPressAndroid } : {})}
        isMenuPrimaryAction
        onPressMenuItem={handlePressMenuItem}
        useActionSheetFallback={false}
        wrapNativeComponent={false}
      >
        {pager}
      </ContextMenuButton>
    );
  }, [
    assetColor,
    colors,
    currentNetwork,
    gasIsNotReady,
    gasOptionsAvailable,
    handlePressMenuItem,
    inputFocused,
    menuConfig,
    onPressAndroid,
    selectedGasFeeOption,
    showGasOptions,
    theme,
  ]);

  useEffect(() => {
    const gasOptions = options || GasSpeedOrder;
    const currentSpeedIndex = gasOptions?.indexOf(selectedGasFeeOption);
    // If the option isn't available anymore, we need to reset it
    if (currentSpeedIndex === -1) {
      handlePressSpeedOption();
    }
  }, [handlePressSpeedOption, options, selectedGasFeeOption]);

  // had to do this hack because calling it directly from `onPress`
  // would make the expanded sheet come up with too much force
  // instead calling it from `useEffect` makes it appear smoothly
  useEffect(() => {
    if (
      shouldOpenCustomGasSheet &&
      prevShouldOpenCustomGasSheet !== shouldOpenCustomGasSheet
    ) {
      openCustomGasSheet();
      setShouldOpenCustomGasSheet(false);
    }
  }, [
    openCustomGasSheet,
    prevShouldOpenCustomGasSheet,
    shouldOpenCustomGasSheet,
  ]);

  useEffect(() => {
    if (selectedGasFeeOption === gasUtils.CUSTOM) {
      openCustomGasSheet();
    }
  }, [navigate, openCustomGasSheet, selectedGasFeeOption]);

  useEffect(() => {
    const estimatedTime = get(
      selectedGasFee,
      'estimatedTime.display',
      ''
    ).split(' ');

    setEstimatedTimeValue(estimatedTime[0] || 0);
    setEstimatedTimeUnit(estimatedTime[1] || 'min');
  }, [selectedGasFee, selectedGasFeeOption]);

  return (
    <Container horizontalPadding={horizontalPadding} testID={testID}>
      <Row align="center" justify="space-between">
        <Column>
          <ButtonPressAnimation
            onPress={openGasHelper}
            testID="estimated-fee-label"
          >
            <Row>
              <NativeCoinIconWrapper>
                <CoinIcon
                  address={nativeFeeCurrencySymbol.address}
                  size={18}
                  symbol={nativeFeeCurrencySymbol.symbol}
                />
              </NativeCoinIconWrapper>
              <Column>
                <AnimateNumber
                  formatter={formatGasPrice}
                  interval={6}
                  renderContent={renderGasPriceText}
                  steps={6}
                  timing="linear"
                  value={price}
                />
              </Column>
              <Column>
                <TransactionTimeLabel
                  formatter={formatTransactionTime}
                  theme={theme}
                  value={{
                    estimatedTimeValue,
                    price,
                  }}
                />
              </Column>
            </Row>
            <Row justify="space-between" marginTop={android ? -10 : 0}>
              <Label
                color={
                  theme === 'dark'
                    ? colors.alpha(darkModeThemeColors.blueGreyDark, 0.6)
                    : colors.alpha(colors.blueGreyDark, 0.6)
                }
                size="smedium"
              >
                Estimated Fee{' '}
                <Label
                  color={
                    theme === 'dark'
                      ? colors.alpha(darkModeThemeColors.blueGreyDark, 0.4)
                      : colors.alpha(colors.blueGreyDark, 0.4)
                  }
                  size="smedium"
                >
                  􀅵
                </Label>
              </Label>
            </Row>
          </ButtonPressAnimation>
        </Column>
        <Column>
          <Row>
            <Column testID="gas-speed-pager">{renderGasSpeedPager}</Column>
            <Column justify="center">
              {isL2 ? (
                <ChainBadgeContainer>
                  <ChainBadge assetType={currentNetwork} position="relative" />
                </ChainBadgeContainer>
              ) : showGasOptions ? (
                <CustomGasButton
                  borderColor={colorForAsset}
                  onPress={onDonePress}
                >
                  <DoneCustomGas
                    color={
                      theme !== 'light'
                        ? colors.whiteLabel
                        : colors.alpha(colors.blueGreyDark, 0.8)
                    }
                  >
                    Done
                  </DoneCustomGas>
                </CustomGasButton>
              ) : (
                <CustomGasButton
                  borderColor={colorForAsset}
                  onPress={openCustomOptions}
                  testID="gas-speed-custom"
                >
                  <Symbol
                    color={
                      theme !== 'light'
                        ? colors.whiteLabel
                        : colors.alpha(colors.blueGreyDark, 0.8)
                    }
                  >
                    􀌆
                  </Symbol>
                </CustomGasButton>
              )}
            </Column>
          </Row>
        </Column>
      </Row>
    </Container>
  );
};

export default magicMemo(GasSpeedButton, 'type');