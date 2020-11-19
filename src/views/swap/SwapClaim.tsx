import { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { ColorButton } from 'src/components/buttons/colorButton/ColorButton';
import {
  MultiButton,
  SingleButton,
} from 'src/components/buttons/multiButton/MultiButton';
import {
  DarkSubTitle,
  Separation,
  SubTitle,
} from 'src/components/generic/Styled';
import { Input } from 'src/components/input';
import { InputWithDeco } from 'src/components/input/InputWithDeco';
import { useConfigState } from 'src/context/ConfigContext';
import { useClaimBoltzTransactionMutation } from 'src/graphql/mutations/__generated__/claimBoltzTransaction.generated';
import { useBitcoinFees } from 'src/hooks/UseBitcoinFees';
import { chartColors } from 'src/styles/Themes';
import { getErrorContent } from 'src/utils/error';
import styled from 'styled-components';
import { useSwapsDispatch, useSwapsState } from './SwapContext';
import { MEMPOOL } from './SwapStatus';

const S = {
  warning: styled.div`
    border: 1px solid ${chartColors.darkyellow};
    background-color: rgba(255, 193, 10, 0.1);
    padding: 4px 8px;
    border-radius: 8px;
    text-align: center;
    font-size: 14px;
  `,
};

export const SwapClaim = () => {
  const { fetchFees } = useConfigState();
  const { fast, halfHour, hour, dontShow } = useBitcoinFees();

  const [fee, setFee] = useState<number>(0);
  const [type, setType] = useState('fee');

  const {
    swaps,
    claim,
    claimType,
    claimTransaction: transactionHex,
  } = useSwapsState();
  const dispatch = useSwapsDispatch();

  const [
    claimTransaction,
    { data, loading },
  ] = useClaimBoltzTransactionMutation({
    onError: error => toast.error(getErrorContent(error)),
  });

  useEffect(() => {
    if (!data?.claimBoltzTransaction || typeof claim !== 'number') return;
    dispatch({
      type: 'complete',
      index: claim,
      transactionId: data.claimBoltzTransaction,
    });
    toast.success('Transaction Claimed');
  }, [data, dispatch, claim]);

  const Missing = () => (
    <>
      <DarkSubTitle>
        Missing information to claim transaction. Please try again.
      </DarkSubTitle>
    </>
  );

  if (typeof claim !== 'number') {
    return <Missing />;
  }

  const claimingSwap = swaps[claim];
  const { redeemScript, preimage, receivingAddress, privateKey } = claimingSwap;

  if (!preimage || !transactionHex || !privateKey) {
    return <Missing />;
  }

  const renderButton = (
    onClick: () => void,
    text: string,
    selected: boolean
  ) => (
    <SingleButton selected={selected} onClick={onClick}>
      {text}
    </SingleButton>
  );

  return (
    <>
      <SubTitle>Claim the Transaction</SubTitle>
      {claimType === MEMPOOL && (
        <>
          <Separation />
          <S.warning>
            This will be an instant swap. This means that the locking
            transaction from Boltz has still not been confirmed in the
            blockchain.
          </S.warning>
        </>
      )}
      <Separation />
      {fetchFees && !dontShow && (
        <InputWithDeco title={'Fee'} noInput={true}>
          <MultiButton>
            {renderButton(
              () => {
                setType('none');
                setFee(fast);
              },
              'Auto',
              type === 'none'
            )}
            {renderButton(
              () => {
                setFee(0);
                setType('fee');
              },
              'Fee (Sats/Byte)',
              type === 'fee'
            )}
          </MultiButton>
        </InputWithDeco>
      )}
      <InputWithDeco title={'Fee Amount'} amount={fee * 223} noInput={true}>
        {type !== 'none' && (
          <Input
            maxWidth={'240px'}
            placeholder={'Sats/Byte'}
            type={'number'}
            onChange={e => setFee(Number(e.target.value))}
          />
        )}
        {type === 'none' && (
          <MultiButton>
            {renderButton(
              () => setFee(fast),
              `Fastest (${fast} sats)`,
              fee === fast
            )}
            {halfHour !== fast &&
              renderButton(
                () => setFee(halfHour),
                `Half Hour (${halfHour} sats)`,
                fee === halfHour
              )}
            {renderButton(
              () => setFee(hour),
              `Hour (${hour} sats)`,
              fee === hour
            )}
          </MultiButton>
        )}
      </InputWithDeco>
      <ColorButton
        loading={loading}
        disabled={loading || !fee || fee <= 0}
        fullWidth={true}
        withMargin={'16px 0 0'}
        onClick={() =>
          claimTransaction({
            variables: {
              redeem: redeemScript,
              transaction: transactionHex,
              preimage,
              privateKey,
              destination: receivingAddress,
              fee,
            },
          })
        }
      >
        Claim
      </ColorButton>
    </>
  );
};
