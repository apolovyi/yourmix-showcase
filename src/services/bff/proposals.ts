import { api } from '@/services/api-client';
import type {
  Proposal,
  ProposalItem,
  OverrideReason,
  UploadResponse,
  FileStatusResponse,
} from '@/types';

export async function getProposals(product?: string): Promise<Proposal[]> {
  const query = product ? { product } : undefined;
  const { data } = await api.GET('/api/pricing/proposals', { params: { query } });
  return data!;
}

export async function getProposal(id: string): Promise<Proposal> {
  const { data } = await api.GET('/api/pricing/proposals/{id}', {
    params: { path: { id } },
  });
  return data!;
}

export async function getProposalItems(id: string): Promise<ProposalItem[]> {
  const { data } = await api.GET('/api/pricing/proposals/{id}/items', {
    params: { path: { id } },
  });
  return data!;
}

export async function uploadSupplierFile(file: File): Promise<UploadResponse> {
  const { data } = await api.POST('/api/pricing/upload', {
    body: { file: file as unknown as string },
    bodySerializer: (body) => {
      const fd = new FormData();
      fd.append('file', body!.file as unknown as Blob);
      return fd;
    },
  });
  return data!;
}

export async function getFileStatus(fileId: string): Promise<FileStatusResponse> {
  const { data } = await api.GET('/api/pricing/files/{fileId}/status', {
    params: { path: { fileId } },
  });
  return data!;
}

export async function approveProposal(id: string): Promise<Proposal> {
  const { data } = await api.POST('/api/pricing/proposals/{id}/approve', {
    params: { path: { id } },
  });
  return data!;
}

export async function rejectProposal(id: string): Promise<Proposal> {
  const { data } = await api.POST('/api/pricing/proposals/{id}/reject', {
    params: { path: { id } },
  });
  return data!;
}

export async function approveItem(proposalId: string, itemId: string): Promise<ProposalItem> {
  const { data } = await api.POST('/api/pricing/proposals/{id}/items/{itemId}/approve', {
    params: { path: { id: proposalId, itemId } },
  });
  return data!;
}

export async function rejectItem(proposalId: string, itemId: string): Promise<ProposalItem> {
  const { data } = await api.POST('/api/pricing/proposals/{id}/items/{itemId}/reject', {
    params: { path: { id: proposalId, itemId } },
  });
  return data!;
}

export async function overrideItemPrice(
  proposalId: string,
  itemId: string,
  price: number,
  reason: OverrideReason,
): Promise<ProposalItem> {
  const { data } = await api.PUT('/api/pricing/proposals/{id}/items/{itemId}/override', {
    params: { path: { id: proposalId, itemId } },
    body: { price, reason },
  });
  return data!;
}

export async function mapUnmatchedItem(
  proposalId: string,
  itemId: string,
  cscartProductId: number,
): Promise<ProposalItem> {
  const { data } = await api.PUT('/api/pricing/proposals/{id}/items/{itemId}/map', {
    params: { path: { id: proposalId, itemId } },
    body: { cscartProductId },
  });
  return data!;
}

export async function retryFile(fileId: string): Promise<FileStatusResponse> {
  const { data } = await api.POST('/api/pricing/files/{fileId}/retry', {
    params: { path: { fileId } },
  });
  return data!;
}

export async function getRecentUploads(): Promise<FileStatusResponse[]> {
  const { data } = await api.GET('/api/pricing/files/recent');
  return data!;
}
