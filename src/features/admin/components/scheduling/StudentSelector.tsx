// src/features/admin/components/scheduling/StudentSelector.tsx
"use client";

import React, { useState } from "react";
import {
    Select,
    SelectTrigger,
    SelectValue,
    SelectContent,
    SelectItem,
} from "@/components/ui/select";
import { api } from "@/lib/api";

export const StudentSelector: React.FC = () => {
    // Fix: Change getStudents to student.getStudents to use the namespaced procedure
    const { data: students, isLoading } = api.admin.student.getStudents.useQuery({});

    // Local state for the selected student id.
    const [selectedStudent, setSelectedStudent] = useState<string>("");

    if (isLoading) {
        return <div>Loading students…</div>;
    }

    return (
        <div className="space-y-2">
            <label className="block text-sm font-medium text-foreground">
                Select Student
            </label>
            <Select value={selectedStudent} onValueChange={setSelectedStudent}>
                <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select a student" />
                </SelectTrigger>
                <SelectContent>
                    {students?.students?.map((student: any) => (
                        <SelectItem key={student.id} value={student.id}>
                            {student.user.name}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
        </div>
    );
};