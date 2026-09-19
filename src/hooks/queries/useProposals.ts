import {
  useQuery,
  useMutation,
  useQueryClient,
  type UseQueryResult,
  type UseMutationResult,
} from '@tanstack/react-query';
import {
  getProposals,
  getProposal,
  getProposalItems,
  uploadSupplierFile,
  getFileStatus,
  approveProposal,
  rejectProposal,
  approveItem as approveItemService,
  rejectItem as rejectItemService,
  overrideItemPrice,
  mapUnmatchedItem,
  retryFile,
  getRecentUploads,
  revertProposal,
} from '@/services';
import type {
  Proposal,
  ProposalItem,
  OverrideReason,
  UploadResponse,
  FileStatusResponse,
  RevertResponse,
} from '@/types';

export function useProposals(product?: string): UseQueryResult<Proposal[], Error> {
  return useQuery({
    queryKey: ['proposals', product ?? ''],
    queryFn: () => getProposals(product),
    staleTime: 30 * 1000,
  });
}

export function useProposal(id: string | undefined): UseQueryResult<Proposal, Error> {
  return useQuery({
    queryKey: ['proposals', id],
    queryFn: () => getProposal(id!),
    enabled: !!id,
    staleTime: 30 * 1000,
  });
}

export function useProposalItems(id: string | undefined): UseQueryResult<ProposalItem[], Error> {
  return useQuery({
    queryKey: ['proposals', id, 'items'],
    queryFn: () => getProposalItems(id!),
    enabled: !!id,
    staleTime: 30 * 1000,
  });
}

export function useFileStatus(fileId: string | null): UseQueryResult<FileStatusResponse, Error> {
  return useQuery({
    queryKey: ['file-status', fileId],
    queryFn: () => getFileStatus(fileId!),
    enabled: !!fileId,
    refetchInterval: (query) => {
      const status = query.state.data?.parseStatus;
      if (status === 'PARSED' || status === 'FAILED') return false;
      return 2000;
    },
  });
}

export function useUploadFile(): UseMutationResult<UploadResponse, Error, { file: File }> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ file }) => uploadSupplierFile(file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['proposals'] });
      queryClient.invalidateQueries({ queryKey: ['unmatched-categories'] });
      queryClient.invalidateQueries({ queryKey: ['failure-summary'] });
      queryClient.invalidateQueries({ queryKey: ['multi-supplier-products'] });
    },
  });
}

export function useApproveProposal(): UseMutationResult<Proposal, Error, string> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: approveProposal,
    onSuccess: (_data, id) => {
      queryClient.invalidateQueries({ queryKey: ['proposals'] });
      queryClient.invalidateQueries({ queryKey: ['proposals', id] });
    },
  });
}

export function useRejectProposal(): UseMutationResult<Proposal, Error, string> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: rejectProposal,
    onSuccess: (_data, id) => {
      queryClient.invalidateQueries({ queryKey: ['proposals'] });
      queryClient.invalidateQueries({ queryKey: ['proposals', id] });
    },
  });
}

export function useApproveItem(): UseMutationResult<
  ProposalItem,
  Error,
  { proposalId: string; itemId: string }
> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ proposalId, itemId }) => approveItemService(proposalId, itemId),
    onSuccess: (_data, { proposalId }) => {
      queryClient.invalidateQueries({ queryKey: ['proposals', proposalId, 'items'] });
      queryClient.invalidateQueries({ queryKey: ['proposals', proposalId] });
    },
  });
}

export function useRejectItem(): UseMutationResult<
  ProposalItem,
  Error,
  { proposalId: string; itemId: string }
> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ proposalId, itemId }) => rejectItemService(proposalId, itemId),
    onSuccess: (_data, { proposalId }) => {
      queryClient.invalidateQueries({ queryKey: ['proposals', proposalId, 'items'] });
      queryClient.invalidateQueries({ queryKey: ['proposals', proposalId] });
    },
  });
}

export function useOverridePrice(): UseMutationResult<
  ProposalItem,
  Error,
  { proposalId: string; itemId: string; price: number; reason: OverrideReason }
> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ proposalId, itemId, price, reason }) =>
      overrideItemPrice(proposalId, itemId, price, reason),
    onSuccess: (_data, { proposalId }) => {
      queryClient.invalidateQueries({ queryKey: ['proposals', proposalId, 'items'] });
      queryClient.invalidateQueries({ queryKey: ['proposals', proposalId] });
    },
  });
}

export function useMapItem(): UseMutationResult<
  ProposalItem,
  Error,
  { proposalId: string; itemId: string; cscartProductId: number }
> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ proposalId, itemId, cscartProductId }) =>
      mapUnmatchedItem(proposalId, itemId, cscartProductId),
    onSuccess: (_data, { proposalId }) => {
      queryClient.invalidateQueries({ queryKey: ['proposals', proposalId, 'items'] });
      queryClient.invalidateQueries({ queryKey: ['proposals', proposalId] });
    },
  });
}

export function useRetryFile(): UseMutationResult<FileStatusResponse, Error, string> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: retryFile,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recent-uploads'] });
    },
  });
}

export function useRecentUploads(): UseQueryResult<FileStatusResponse[], Error> {
  return useQuery({
    queryKey: ['recent-uploads'],
    queryFn: getRecentUploads,
    refetchInterval: 5000,
  });
}

export function useRevertProposal(): UseMutationResult<RevertResponse, Error, string> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: revertProposal,
    onSuccess: (_data, id) => {
      queryClient.invalidateQueries({ queryKey: ['proposals'] });
      queryClient.invalidateQueries({ queryKey: ['proposals', id] });
      queryClient.invalidateQueries({ queryKey: ['proposals', id, 'items'] });
      queryClient.invalidateQueries({ queryKey: ['failure-summary'] });
    },
  });
}
