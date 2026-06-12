'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, FileEdit, Trash2, Ellipsis, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Sheet, SheetTrigger, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { LogOut } from 'lucide-react';

interface Document {
  id: string;
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

export default function DocumentsPage() {
  const router = useRouter();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [logoutDialogOpen, setLogoutDialogOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [dropdownOpen, setDropdownOpen] = useState<string | null>(null);
  const [editSheetOpen, setEditSheetOpen] = useState(false);
  const [editingDoc, setEditingDoc] = useState<Document | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [page, setPage] = useState(1);
  const pageSize = 8;
  const totalPages = Math.max(1, Math.ceil(documents.length / pageSize));
  const paginatedDocuments = documents.slice((page - 1) * pageSize, page * pageSize);
  const [searchInput, setSearchInput] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');

  const fetchDocuments = useCallback(async (signal?: AbortSignal) => {
    setIsLoading(true);
    try {
      const params = appliedSearch ? `?search=${encodeURIComponent(appliedSearch)}` : '';
      const response = await fetch(`/api/documents${params}`, { signal });
      if (!response.ok) throw new Error('Failed to fetch documents');
      const data = await response.json();
      setDocuments(data);
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  }, [appliedSearch]);

  useEffect(() => {
    const abortController = new AbortController();
    setPage(1);
    fetchDocuments(abortController.signal);
    return () => abortController.abort();
  }, [fetchDocuments]);

  const handleSearch = () => {
    setAppliedSearch(searchInput.trim());
  };

  const createDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    try {
      const response = await fetch('/api/documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: title.trim(), content: '' }),
      });
      if (!response.ok) throw new Error('Failed to create document');
      const newDoc = await response.json();
      setDocuments([newDoc, ...documents]);
      setTitle('');
      setSheetOpen(false);
      router.push(`/documents/${newDoc.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    }
  };

  const deleteDocument = async (id: string) => {
    try {
      const response = await fetch(`/api/documents/${id}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Failed to delete document');
      setDocuments(documents.filter(doc => doc.id !== id));
      setDropdownOpen(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    }
  };

  const updateDocumentTitle = async (id: string, title: string) => {
    try {
      const response = await fetch(`/api/documents/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title }),
      });
      if (!response.ok) throw new Error('Failed to update document');
      setDocuments(documents.map(doc => (doc.id === id ? { ...doc, title } : doc)));
      setEditSheetOpen(false);
      setEditingDoc(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    }
  };

  if (isLoading) return <div className="p-6">Loading...</div>;
  if (error) return <div className="p-6 text-red-500">Error: {error}</div>;

  return (
    <div className="flex flex-col h-screen w-full mx-auto px-5 pt-6 pb-8 bg-white max-w-7xl overflow-y-auto">
      <header className="flex w-full flex-row items-center justify-between gap-3 pb-5">
        <h1 className="text-2xl text-foreground font-semibold min-w-0">Documents</h1>
        <div className="flex items-center gap-2">
          <Dialog open={logoutDialogOpen} onOpenChange={setLogoutDialogOpen}>
            <DialogTrigger asChild>
              <button
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition cursor-pointer"
              >
                <LogOut className="h-4 w-4" />
                Logout
              </button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Confirm Logout</DialogTitle>
                <DialogDescription>
                  Are you sure you want to log out? You will be redirected to the home page.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button variant="outline" onClick={() => setLogoutDialogOpen(false)}>
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={async () => {
                    await fetch('/api/auth/logout', { method: 'POST' });
                    router.push('/');
                  }}
                >
                  Logout
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
            <SheetTrigger asChild>
              <Button className="inline-flex items-center justify-center whitespace-nowrap text-sm font-medium h-9 w-9 sm:w-auto px-0 sm:px-3 rounded-[10px] shrink-0 bg-foreground text-background shadow-none hover:bg-gray-800 cursor-pointer">
                <Plus className="shrink-0 w-[18px] h-[18px]" />
                <span className="hidden sm:inline ml-[6px]">New document</span>
              </Button>
            </SheetTrigger>
            <SheetContent>
              <SheetHeader>
                <SheetTitle>Create Document</SheetTitle>
              </SheetHeader>
              <form onSubmit={createDocument} className="mt-6 space-y-4">
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Document title..."
                  autoFocus
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <Button type="submit" className="w-full bg-foreground text-background hover:bg-gray-800">
                  Create Document
                </Button>
              </form>
            </SheetContent>
          </Sheet>
          <Sheet open={editSheetOpen} onOpenChange={setEditSheetOpen}>
            <SheetContent>
              <SheetHeader>
                <SheetTitle>Edit Document Title</SheetTitle>
              </SheetHeader>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (editingDoc && editTitle.trim()) {
                    updateDocumentTitle(editingDoc.id, editTitle.trim());
                  }
                }}
                className="mt-6 space-y-4"
              >
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  placeholder="Document title..."
                  autoFocus
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <Button type="submit" className="w-full bg-foreground text-background hover:bg-gray-800">
                  Save
                </Button>
              </form>
            </SheetContent>
          </Sheet>
        </div>
      </header>

      <div className="flex flex-col gap-3 pb-3">
        <div className="flex min-w-0 w-full flex-row flex-wrap gap-3 items-center">
          <div className="flex min-w-0 flex-1 gap-2">
            <Input
              placeholder="Search documents..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleSearch(); }}
              className="min-w-0 flex-1 h-9 px-3 py-1 text-sm rounded-[10px] border-gray-200 bg-transparent shadow-none placeholder:text-gray-400 focus-visible:border-foreground hover:border-gray-300 focus-visible:ring-[0.5px] focus-visible:ring-offset-0"
            />
            <Button
              type="button"
              onClick={handleSearch}
              className="h-9 shrink-0 px-3 rounded-[10px] bg-foreground text-background hover:bg-gray-800"
              aria-label="Search documents"
            >
              <Search className="w-4 h-4" />
            </Button>
          </div>
        </div>
        <div className="px-2.5 grid grid-cols-[1fr_auto_auto] items-center h-9 py-2 border-b border-gray-200">
          <div className="flex gap-1.5 items-center text-sm text-gray-500 font-medium whitespace-nowrap justify-self-start">
            <p className="text-sm text-gray-500 font-medium mr-1.5">Name</p>
          </div>
          <div className="flex gap-1.5 items-center text-sm text-gray-500 font-medium whitespace-nowrap justify-self-start max-md:hidden">
            <p className="text-sm text-gray-500 font-medium whitespace-nowrap mr-1.5">Created</p>
          </div>
          <div className="flex gap-1.5 items-center text-sm text-gray-500 font-medium whitespace-nowrap justify-self-start w-0 overflow-hidden">
            <span className="sr-only">Actions</span>
          </div>
        </div>
      </div>

      <div className="flex-1">
        {documents.length > 0 ? (
          <div className="col-span-full grid grid-cols-1 gap-y-2 py-3">
            {paginatedDocuments.map((doc) => (
              <div
                key={doc.id}
                className="group/row relative col-span-full px-2.5 grid grid-cols-[1fr_auto_auto] grid-rows-1 items-center py-1.5 rounded-lg hover:bg-gray-50 cursor-pointer"
                onClick={() => router.push(`/documents/${doc.id}`)}
              >
                <div className="flex-1 min-w-0 max-w-[400px]">
                  <div className="flex gap-2 items-center">
                    <div className="flex flex-col min-w-0 items-start mr-auto">
                      <p className="text-sm text-foreground font-medium line-clamp-1 min-w-0">
                        {doc.title || "Untitled"}
                      </p>
                      <p className="text-sm font-normal line-clamp-1 w-full min-w-0 text-gray-500">
                        {new Date(doc.createdAt).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}
                      </p>
                    </div>
                  </div>
                </div>
                <p className="text-sm text-gray-500 font-normal whitespace-nowrap max-md:hidden">
                  {new Date(doc.createdAt).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}
                </p>
                <div className="flex justify-end gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    className="h-9 w-9 rounded-[10px] text-gray-500 hover:text-foreground hover:bg-gray-100"
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditingDoc(doc);
                      setEditTitle(doc.title);
                      setEditSheetOpen(true);
                    }}
                    aria-label="Edit"
                  >
                    <FileEdit className="w-[18px] h-[18px]" />
                  </Button>
                  <div className="relative">
                    <Button
                      type="button"
                      variant="ghost"
                      className="h-9 w-9 rounded-[10px] text-gray-500 hover:text-foreground hover:bg-gray-100"
                      onClick={(e) => {
                        e.stopPropagation();
                        setDropdownOpen(dropdownOpen === doc.id ? null : doc.id);
                      }}
                    >
                      <Ellipsis className="w-[18px] h-[18px]" />
                    </Button>
                    {dropdownOpen === doc.id && (
                      <div className="absolute right-0 mt-1 w-48 bg-background border border-gray-200 rounded-lg shadow-lg z-10">
                        <button
                          type="button"
                          className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2 rounded-t-lg cursor-pointer"
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingDoc(doc);
                            setEditTitle(doc.title);
                            setEditSheetOpen(true);
                            setDropdownOpen(null);
                          }}
                        >
                          <FileEdit className="w-4 h-4" />
                          Edit
                        </button>
                        <button
                          type="button"
                          className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2 rounded-b-lg cursor-pointer"
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteDocument(doc.id);
                          }}
                        >
                          <Trash2 className="w-4 h-4" />
                          Delete
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="col-span-full flex flex-col items-center justify-center py-12">
            <h2 className="text-lg font-semibold">No documents yet</h2>
            <p className="text-sm text-gray-500 mt-2">Create your first document to get started</p>
            <Button
              type="button"
              onClick={() => setSheetOpen(true)}
              className="mt-4 inline-flex items-center h-9 px-3 rounded-[10px] bg-foreground text-background hover:bg-gray-800"
            >
              <Plus className="w-4 h-4 mr-2" />
              New document
            </Button>
          </div>
        )}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 py-4">
            <Button
              variant="outline"
              size="icon"
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
              className="h-8 w-8 cursor-pointer"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
              <Button
                key={p}
                variant={p === page ? "default" : "outline"}
                size="icon"
                onClick={() => setPage(p)}
                className="h-8 w-8 text-xs cursor-pointer"
              >
                {p}
              </Button>
            ))}
            <Button
              variant="outline"
              size="icon"
              disabled={page >= totalPages}
              onClick={() => setPage(page + 1)}
              className="h-8 w-8 cursor-pointer"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
