# Harbor & Pine — Carrier Claims & Escalation Guide

_Internal operations reference. Not customer-facing._

## 1. Which carrier handles what

| Carrier | Typical use | Claim window | Claim contact |
|---|---|---|---|
| UPS | Standard Ground and Expedited, most parcels | 60 days from ship date | UPS Claims portal, account 4X21R8 |
| FedEx | Expedited and all freight | 21 days for damage, 9 months for loss | FedEx Claims online |
| USPS | Lightweight items under 2 lb | 60 days for damage, 15 days minimum wait for loss | Domestic Claims form |

## 2. Filing a claim

Harbor & Pine files carrier claims internally. Support must never tell a customer to file a claim themselves — the shipper of record is Harbor & Pine, and a customer-filed claim will be rejected.

A claim needs: the tracking number, the order number, the declared value, and photographs of the damage where the parcel was received. Where the parcel never arrived, no photographs are needed.

Claim recovery is an accounting matter and has no bearing on how quickly the customer is made whole. Resolve the customer first, then file.

## 3. Escalating to a human

Escalate to the operations team, rather than resolving in support, when any of the following is true:

- The refund amount exceeds the agent's approval threshold.
- The same order has already been refunded once and the customer is asking for more.
- The customer has three or more delayed orders in the last 90 days, which usually indicates an address or routing problem rather than a carrier incident.
- The customer states they intend to pursue a chargeback.
- The order is a freight shipment.

## 4. Repeat delay patterns

Where a single destination ZIP code produces repeated delivery exceptions, operations reviews the carrier assignment for that ZIP. Three exceptions in a rolling 30 days triggers this review. Support does not need to act on this beyond noting the pattern in the ticket.

## 5. Tracking status meanings

| Status | What it means |
|---|---|
| `label_created` | Harbor & Pine has printed a label. The carrier has not scanned the parcel. Not yet in transit. |
| `in_transit` | The carrier has the parcel and it is moving through their network. |
| `out_for_delivery` | On a vehicle for delivery today. |
| `delivered` | Carrier reports the parcel handed over or left at the address. |
| `exception` | The carrier attempted and failed, or the parcel was damaged, misrouted, or refused. Always requires action. |
| `returned` | The parcel is on its way back to Harbor & Pine. |

A parcel sitting at `label_created` for more than 2 business days has almost certainly not been collected and should be re-shipped rather than investigated with the carrier.
