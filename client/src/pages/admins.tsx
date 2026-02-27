import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { authFetch } from "@/hooks/use-auth";
import { Loader2, Plus, Edit2, Trash2, Mail, Lock, ShieldAlert } from "lucide-react";
import { motion } from "framer-motion";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Admin = {
    id: number;
    username: string;
};

export default function Admins() {
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [isEditOpen, setIsEditOpen] = useState(false);
    const [isDeleteOpen, setIsDeleteOpen] = useState(false);
    const [selectedAdmin, setSelectedAdmin] = useState<Admin | null>(null);

    // Form State
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");

    const { data: admins, isLoading } = useQuery<Admin[]>({
        queryKey: ["/api/admins"],
        queryFn: () => authFetch("/api/admins"),
    });

    const createMutation = useMutation({
        mutationFn: (data: any) =>
            authFetch("/api/admins", {
                method: "POST",
                body: JSON.stringify(data),
            }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/admins"] });
            setIsCreateOpen(false);
            resetForm();
            toast({ title: "Success", description: "Admin created successfully" });
        },
        onError: (err: Error) => {
            toast({ title: "Error", description: err.message, variant: "destructive" });
        },
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, data }: { id: number; data: any }) =>
            authFetch(`/api/admins/${id}`, {
                method: "PUT",
                body: JSON.stringify(data),
            }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/admins"] });
            setIsEditOpen(false);
            resetForm();
            toast({ title: "Success", description: "Admin updated successfully" });
        },
        onError: (err: Error) => {
            toast({ title: "Error", description: err.message, variant: "destructive" });
        },
    });

    const deleteMutation = useMutation({
        mutationFn: (id: number) =>
            authFetch(`/api/admins/${id}`, {
                method: "DELETE",
            }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/admins"] });
            setIsDeleteOpen(false);
            setSelectedAdmin(null);
            toast({ title: "Success", description: "Admin deleted successfully" });
        },
        onError: (err: Error) => {
            toast({ title: "Error", description: err.message, variant: "destructive" });
        },
    });

    const resetForm = () => {
        setUsername("");
        setPassword("");
        setSelectedAdmin(null);
    };

    const handleCreate = (e: React.FormEvent) => {
        e.preventDefault();
        createMutation.mutate({ username, password });
    };

    const handleUpdate = (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedAdmin) return;
        const data: any = { username };
        if (password) data.password = password; // Only send password if changed
        updateMutation.mutate({ id: selectedAdmin.id, data });
    };

    const openEdit = (admin: Admin) => {
        setSelectedAdmin(admin);
        setUsername(admin.username);
        setPassword(""); // Clear password field for edit
        setIsEditOpen(true);
    };

    const openDelete = (admin: Admin) => {
        setSelectedAdmin(admin);
        setIsDeleteOpen(true);
    };

    return (
        <div className="space-y-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-display font-bold text-slate-900">Admin Settings</h1>
                    <p className="text-slate-500 mt-1">Manage portal administrators and their credentials.</p>
                </div>
                <Button onClick={() => { resetForm(); setIsCreateOpen(true); }} className="gap-2">
                    <Plus className="w-4 h-4" />
                    Add New Admin
                </Button>
            </div>

            <div className="glass-panel rounded-2xl overflow-hidden">
                {isLoading ? (
                    <div className="p-12 flex flex-col items-center justify-center text-muted-foreground">
                        <Loader2 className="w-10 h-10 animate-spin text-primary mb-4" />
                        <p>Loading administrators...</p>
                    </div>
                ) : !admins || admins.length === 0 ? (
                    <div className="p-16 flex flex-col items-center justify-center text-center">
                        <ShieldAlert className="w-12 h-12 text-slate-300 mb-4" />
                        <h3 className="text-xl font-display font-semibold text-slate-900 mb-2">No admins found</h3>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-slate-200 bg-slate-50 text-sm font-medium text-slate-500">
                                    <th className="p-4 pl-6">ID</th>
                                    <th className="p-4">Username / Email</th>
                                    <th className="p-4 text-right pr-6">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {admins.map((admin, i) => (
                                    <motion.tr
                                        key={admin.id}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: i * 0.05 }}
                                        className="hover:bg-slate-50 transition-colors group"
                                    >
                                        <td className="p-4 pl-6 text-slate-500 font-mono text-sm">#{admin.id}</td>
                                        <td className="p-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                                                    <ShieldAlert className="w-4 h-4" />
                                                </div>
                                                <span className="text-slate-900 font-medium">{admin.username}</span>
                                            </div>
                                        </td>
                                        <td className="p-4 pr-6 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <Button variant="ghost" size="icon" onClick={() => openEdit(admin)}>
                                                    <Edit2 className="w-4 h-4 text-slate-500" />
                                                </Button>
                                                <Button variant="ghost" size="icon" onClick={() => openDelete(admin)}>
                                                    <Trash2 className="w-4 h-4 text-destructive/70 hover:text-destructive" />
                                                </Button>
                                            </div>
                                        </td>
                                    </motion.tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Create Modal */}
            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle>Create Admin Account</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleCreate} className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="username">Username or Email</Label>
                            <Input
                                id="username"
                                type="text"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                placeholder="admin or admin@kits.edu"
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="password">Password</Label>
                            <Input
                                id="password"
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="Enter password"
                                required
                                minLength={6}
                            />
                        </div>
                        <DialogFooter>
                            <Button type="submit" disabled={createMutation.isPending}>
                                {createMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Create Admin
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Edit Modal */}
            <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle>Edit Admin Account</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleUpdate} className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="edit-username">Username or Email</Label>
                            <Input
                                id="edit-username"
                                type="text"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="edit-password">New Password (optional)</Label>
                            <Input
                                id="edit-password"
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="Leave blank to keep current"
                                minLength={6}
                            />
                        </div>
                        <DialogFooter>
                            <Button type="submit" disabled={updateMutation.isPending}>
                                {updateMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Save Changes
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation Modal */}
            <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle>Delete Admin</DialogTitle>
                    </DialogHeader>
                    <div className="py-4">
                        <p className="text-slate-600">
                            Are you sure you want to delete the admin account for <strong>{selectedAdmin?.username}</strong>?
                            This action cannot be undone.
                        </p>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsDeleteOpen(false)}>Cancel</Button>
                        <Button
                            variant="destructive"
                            onClick={() => deleteMutation.mutate(selectedAdmin!.id)}
                            disabled={deleteMutation.isPending}
                        >
                            {deleteMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Delete Account
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
