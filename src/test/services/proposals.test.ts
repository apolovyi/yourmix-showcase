import { describe, it, expect } from 'vitest';
import {
  getProposals,
  getProposal,
  getProposalItems,
  approveProposal,
  rejectProposal,
  approveItem,
  rejectItem,
  overrideItemPrice,
  mapUnmatchedItem,
  getFileStatus,
  getRecentUploads,
} from '@/services/bff/proposals';

describe('Proposals service (MSW)', () => {
  it('getProposals returns proposal list', async () => {
    const proposals = await getProposals();

    expect(Array.isArray(proposals)).toBe(true);
    expect(proposals.length).toBeGreaterThan(0);
    expect(proposals[0]).toHaveProperty('id');
    expect(proposals[0]).toHaveProperty('status');
  });

  it('getProposal returns single proposal', async () => {
    const proposals = await getProposals();
    const proposal = await getProposal(proposals[0].id);

    expect(proposal.id).toBe(proposals[0].id);
  });

  it('getProposalItems returns items for proposal', async () => {
    const items = await getProposalItems('prop-001');

    expect(Array.isArray(items)).toBe(true);
    expect(items.length).toBeGreaterThan(0);
    expect(items[0]).toHaveProperty('proposalId');
  });

  it('approveProposal returns approved status', async () => {
    const result = await approveProposal('prop-001');

    expect(result.status).toBe('APPROVED');
  });

  it('rejectProposal returns rejected status', async () => {
    const result = await rejectProposal('prop-001');

    expect(result.status).toBe('REJECTED');
  });

  it('approveItem marks item as approved', async () => {
    const items = await getProposalItems('prop-001');
    const result = await approveItem('prop-001', items[0].id);

    expect(result.approvalStatus).toBe('APPROVED');
    expect(result.requiresReview).toBe(false);
  });

  it('rejectItem marks item as rejected', async () => {
    const items = await getProposalItems('prop-001');
    const result = await rejectItem('prop-001', items[0].id);

    expect(result.approvalStatus).toBe('REJECTED');
  });

  it('overrideItemPrice sets override price and reason', async () => {
    const items = await getProposalItems('prop-001');
    const result = await overrideItemPrice('prop-001', items[0].id, 99.99, 'PROMOTION');

    expect(result.overridePrice).toBe(99.99);
    expect(result.overrideReason).toBe('PROMOTION');
    expect(result.approvalStatus).toBe('APPROVED');
  });

  it('mapUnmatchedItem links to CS-Cart product', async () => {
    const items = await getProposalItems('prop-001');
    const unmatched = items.find((i) => i.reviewReason === 'UNMATCHED');
    if (!unmatched) throw new Error('No unmatched item in test data');

    const result = await mapUnmatchedItem('prop-001', unmatched.id, 42);

    expect(result.cscartProductId).toBe(42);
    expect(result.approvalStatus).toBe('AUTO_APPROVED');
    expect(result.reviewReason).toBeNull();
  });

  it('getFileStatus returns file parsing status', async () => {
    const result = await getFileStatus('file-001');

    expect(result.fileId).toBe('file-001');
    expect(result.parseStatus).toBe('PARSED');
    expect(result.proposalId).toBe('prop-new-001');
  });

  it('getProposals with product param filters results', async () => {
    const all = await getProposals();
    const filtered = await getProposals('benju');

    expect(Array.isArray(filtered)).toBe(true);
    expect(filtered.length).toBeLessThanOrEqual(all.length);
  });

  it('getRecentUploads returns unresolved uploads', async () => {
    const files = await getRecentUploads();

    expect(Array.isArray(files)).toBe(true);
    expect(files.length).toBe(2);
    expect(files[0].parseStatus).toBe('PENDING');
    expect(files[1].parseStatus).toBe('FAILED');
    expect(files[1].parseError).toBe('Unsupported supplier format');
  });
});
