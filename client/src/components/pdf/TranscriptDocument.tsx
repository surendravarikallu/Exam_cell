import React from 'react';
import { Page, Text, View, Document, StyleSheet, Font, Image } from '@react-pdf/renderer';

// Register fonts if necessary, otherwise use Helvetica
Font.register({
    family: 'Open Sans',
    fonts: [
        { src: 'https://cdn.jsdelivr.net/npm/open-sans-all@0.1.3/fonts/open-sans-regular.ttf' },
        { src: 'https://cdn.jsdelivr.net/npm/open-sans-all@0.1.3/fonts/open-sans-600.ttf', fontWeight: 600 },
        { src: 'https://cdn.jsdelivr.net/npm/open-sans-all@0.1.3/fonts/open-sans-700.ttf', fontWeight: 700 }, // bold
    ]
});

// Styles referencing the exact template borders and layouts
const styles = StyleSheet.create({
    page: {
        padding: 12, // Reduced padding
        fontFamily: 'Open Sans',
        fontSize: 6.5, // Reduced global font size
        position: 'relative',
        height: '100%',
        backgroundColor: '#ffffff'
    },
    pageBorder: {
        position: 'absolute',
        top: 10,
        left: 10,
        right: 10,
        bottom: 10,
        borderWidth: 2,
        borderColor: '#000000',
    },
    headerOuter: {
        borderBottomWidth: 1.5,
        borderBottomColor: '#000',
        paddingBottom: 2,
        marginBottom: 2,
        alignItems: 'center',
    },
    headerImage: {
        width: '100%',
        height: 50, // Smaller header
        objectFit: 'fill' // Stretches to fill width and height
    },
    topInfoBlock: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingHorizontal: 10,
        paddingBottom: 4,
        paddingTop: 2,
        borderBottomWidth: 1.5,
        borderBottomColor: '#000',
        marginBottom: 4, // Tighter info block
    },
    infoCol: {
        display: 'flex',
        flexDirection: 'column',
        gap: 4, // Tighter gaps
        width: '48%',
    },
    infoRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
    },
    infoLabel: {
        width: 75,
        fontWeight: 600
    },
    infoValue: {
        fontWeight: 700,
        flex: 1,
        textTransform: 'uppercase'
    },
    yearRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 4, // Tighter rows
        paddingHorizontal: 8
    },
    semBlock: {
        width: '49%',
    },
    semTitle: {
        textAlign: 'center',
        fontWeight: 700,
        marginBottom: 2,
        fontSize: 7.5,
    },
    table: {
        display: 'flex',
        flexDirection: 'column',
        borderStyle: 'solid',
        borderWidth: 1,
        borderColor: '#000',
    },
    tableHeader: {
        flexDirection: 'row',
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#000',
        alignItems: 'stretch',
    },
    tableRow: {
        flexDirection: 'row',
        borderBottomWidth: 1,
        borderBottomColor: '#000',
        alignItems: 'stretch',
    },
    // Exact Widths summing to 100%
    colSno: { width: '5%', borderRightWidth: 1, borderColor: '#000', padding: 1, display: 'flex', justifyContent: 'center', alignItems: 'center' },
    colTitle: { width: '61%', borderRightWidth: 1, borderColor: '#000', padding: 2, display: 'flex', justifyContent: 'center' },
    colMonth: { width: '13%', borderRightWidth: 1, borderColor: '#000', padding: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: 5 },
    colGrade: { width: '7%', borderRightWidth: 1, borderColor: '#000', padding: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', fontWeight: 'bold' },
    colPts: { width: '7%', borderRightWidth: 1, borderColor: '#000', padding: 1, display: 'flex', justifyContent: 'center', alignItems: 'center' },
    colCr: { width: '7%', padding: 1, display: 'flex', justifyContent: 'center', alignItems: 'center' },

    colHeaderSno: { width: '5%', borderRightWidth: 1, borderColor: '#000', justifyContent: 'center', alignItems: 'center' },
    colHeaderTitle: { width: '61%', borderRightWidth: 1, borderColor: '#000', justifyContent: 'center', alignItems: 'center' },
    colHeaderMonth: { width: '13%', borderRightWidth: 1, borderColor: '#000', justifyContent: 'center', alignItems: 'center' },
    colHeaderGrade: { width: '7%', borderRightWidth: 1, borderColor: '#000', justifyContent: 'center', alignItems: 'center' },
    colHeaderPts: { width: '7%', borderRightWidth: 1, borderColor: '#000', justifyContent: 'center', alignItems: 'center' },
    colHeaderCr: { width: '7%', justifyContent: 'center', alignItems: 'center' },

    gpaBlock: {
        flexDirection: 'row',
        marginTop: 2,
        paddingLeft: 4
    },
    gpaText: {
        fontSize: 6,
    },
    gpaValue: {
        fontWeight: 700
    },
});

const SemLabels: Record<string, string> = {
    "I": "I Year I Semester",
    "II": "I Year II Semester",
    "III": "II Year I Semester",
    "IV": "II Year II Semester",
    "V": "III Year I Semester",
    "VI": "III Year II Semester",
    "VII": "IV Year I Semester",
    "VIII": "IV Year II Semester",
};

const RomanSems = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII"];

// Organize results by year and semester, selecting the BEST attempt for each subject logically
const organizeResults = (results: any[]) => {
    const sems: Record<string, any[]> = {};

    // Group by semester -> subjectKey -> attempts
    const grouped: Record<string, Record<string, any[]>> = {};
    results.forEach(r => {
        if (!r.semester) return;
        if (!grouped[r.semester]) grouped[r.semester] = {};
        const subjectKey = r.subject?.subjectCode || r.subjectId || r.subject?.subjectName || r.id;
        if (!grouped[r.semester][subjectKey]) grouped[r.semester][subjectKey] = [];
        grouped[r.semester][subjectKey].push(r);
    });

    Object.entries(grouped).forEach(([sem, subjectMap]) => {
        const finalResults: any[] = [];
        Object.entries(subjectMap).forEach(([key, attempts]) => {
            const sorted = [...attempts].sort((a, b) => (a.attemptNo || 0) - (b.attemptNo || 0));
            const realAttempts = sorted.filter(a => a.grade?.toUpperCase()?.trim() !== 'CHANGE');

            let chosen;
            if (realAttempts.length > 0) {
                const passAttempt = realAttempts.find(a => a.status === 'PASS');
                chosen = passAttempt ? passAttempt : realAttempts[realAttempts.length - 1];
            } else if (sorted.length > 0) {
                chosen = sorted[sorted.length - 1];
            }

            if (chosen) {
                chosen._orderHint = sorted[0].id || 0;
                finalResults.push(chosen);
            }
        });

        finalResults.sort((a, b) => a._orderHint - b._orderHint);
        sems[sem] = finalResults;
    });

    return sems;
};

// Calculate exact CGPA up to a given semester using deduplicated best attempts
const calcCGPA = (organizedSems: Record<string, any[]>, upToSemIndex: number) => {
    const allowedSems = RomanSems.slice(0, upToSemIndex + 1);

    let totalCredits = 0;
    let totalPoints = 0;

    allowedSems.forEach(sem => {
        const semList = organizedSems[sem] || [];
        semList.forEach(r => {
            // Include credits of passed subjects or failed subjects depending on strict policy.
            // But the transcript normally counts credits of the *resolved attempt* if it has points.
            if (r.subject?.credits && r.gradePoints > 0) {
                totalCredits += r.subject.credits;
                totalPoints += (r.subject.credits * r.gradePoints);
            }
        });
    });

    return totalCredits > 0 ? (totalPoints / totalCredits).toFixed(2) : "0.00";
};

export const TranscriptDocument = ({ studentsData }: { studentsData: { student: any, results: any[] }[] }) => {
    return (
        <Document>
            {studentsData.map(({ student, results }) => {
                const organized = organizeResults(results);

                const formatMonth = (str: string) => {
                    if (!str) return "";
                    const parts = str.split(' ');
                    if (parts.length >= 2) return `${parts[0].substring(0, 3).toUpperCase()} ${parts[1]}`;
                    return str.toUpperCase();
                };

                const yearPairs = [["I", "II"], ["III", "IV"], ["V", "VI"], ["VII", "VIII"]];

                return (
                    <Page key={student.rollNumber} size="A4" style={styles.page}>
                        {/* Master Outer Border matching the template */}
                        <View style={styles.pageBorder} />

                        {/* Top College Header Image */}
                        <View style={{ paddingHorizontal: 6, paddingTop: 6 }}>
                            <View style={styles.headerOuter}>
                                <Image src="/college_header.png" style={styles.headerImage} />
                            </View>

                            {/* Info Block */}
                            <View style={styles.topInfoBlock}>
                                <View style={styles.infoCol}>
                                    <View style={styles.infoRow}>
                                        <Text style={styles.infoLabel}>Program :</Text>
                                        <Text style={styles.infoValue}>B.TECH</Text>
                                    </View>
                                    <View style={styles.infoRow}>
                                        <Text style={styles.infoLabel}>Hall Ticket No :</Text>
                                        <Text style={styles.infoValue}>{student.rollNumber}</Text>
                                    </View>
                                    <View style={styles.infoRow}>
                                        <Text style={styles.infoLabel}>Name :</Text>
                                        <Text style={styles.infoValue}>{student.name}</Text>
                                    </View>
                                </View>

                                <View style={styles.infoCol}>
                                    <View style={styles.infoRow}>
                                        <Text style={styles.infoLabel}>Branch Code :</Text>
                                        <Text style={styles.infoValue}>{student.branch}</Text>
                                    </View>
                                    <View style={styles.infoRow}>
                                        <Text style={styles.infoLabel}>Batch :</Text>
                                        <Text style={styles.infoValue}>{student.batch}</Text>
                                    </View>
                                    <View style={styles.infoRow}>
                                        <Text style={styles.infoLabel}>Regulation Name :</Text>
                                        <Text style={styles.infoValue}>{student.regulation || 'R20'}</Text>
                                    </View>
                                </View>
                            </View>

                            {/* Semester Tables Grid Mapping */}
                            {yearPairs.map((pair, yearIndex) => {
                                const sem1 = pair[0];
                                const sem2 = pair[1];

                                const sem1Data = organized[sem1];
                                const sem2Data = organized[sem2];

                                // Skip rendering the entire year row if both semesters are empty
                                if ((!sem1Data || sem1Data.length === 0) && (!sem2Data || sem2Data.length === 0)) {
                                    return null;
                                }

                                return (
                                    <View key={yearIndex} style={styles.yearRow}>
                                        {[sem1, sem2].map((semVal, colIndex) => {
                                            const semResults = organized[semVal];

                                            // Render empty invisible block to maintain flex layout if only one sem exists
                                            if (!semResults || semResults.length === 0) {
                                                return <View key={`${semVal}-empty`} style={styles.semBlock} />;
                                            }

                                            // Calculate SGPA
                                            let semCredits = 0;
                                            let semPoints = 0;
                                            semResults.forEach(r => {
                                                if (r.subject?.credits && r.gradePoints > 0) {
                                                    semCredits += r.subject.credits;
                                                    semPoints += (r.subject.credits * r.gradePoints);
                                                }
                                            });
                                            const sgpa = semCredits > 0 ? (semPoints / semCredits).toFixed(2) : "0.00";
                                            const cgpaIndex = RomanSems.indexOf(semVal);
                                            const cgpa = calcCGPA(organized, cgpaIndex);

                                            return (
                                                <View key={semVal} style={styles.semBlock} wrap={false}>
                                                    <Text style={styles.semTitle}>{SemLabels[semVal]}</Text>

                                                    <View style={styles.table}>
                                                        <View style={[styles.tableHeader, { height: 35 }]}>
                                                            <View style={styles.colHeaderSno}>
                                                                <Text style={{ transform: 'rotate(-90deg)', fontSize: 4.5, width: 35, textAlign: 'center', fontWeight: 'bold' }}>S.No.</Text>
                                                            </View>
                                                            <View style={styles.colHeaderTitle}>
                                                                <Text style={{ fontSize: 6.5, fontWeight: 'bold', textAlign: 'center' }}>COURSE TITLE</Text>
                                                            </View>
                                                            <View style={styles.colHeaderMonth}>
                                                                <Text style={{ fontSize: 4.5, fontWeight: 'bold', textAlign: 'center' }}>Month</Text>
                                                                <Text style={{ fontSize: 4.5, fontWeight: 'bold', textAlign: 'center' }}>&</Text>
                                                                <Text style={{ fontSize: 4.5, fontWeight: 'bold', textAlign: 'center' }}>Year</Text>
                                                            </View>
                                                            <View style={styles.colHeaderGrade}>
                                                                <Text style={{ transform: 'rotate(-90deg)', fontSize: 4.5, width: 35, textAlign: 'center', fontWeight: 'bold' }}>Grade</Text>
                                                            </View>
                                                            <View style={styles.colHeaderPts}>
                                                                <Text style={{ transform: 'rotate(-90deg)', fontSize: 4.5, width: 35, textAlign: 'center', fontWeight: 'bold' }}>Grade Points</Text>
                                                            </View>
                                                            <View style={styles.colHeaderCr}>
                                                                <Text style={{ transform: 'rotate(-90deg)', fontSize: 4.5, width: 35, textAlign: 'center', fontWeight: 'bold' }}>Credits</Text>
                                                            </View>
                                                        </View>

                                                        {semResults.map((r, i) => {
                                                            const isLast = i === semResults.length - 1;
                                                            return (
                                                                <View key={r.id} style={[styles.tableRow, isLast ? { borderBottomWidth: 0 } : {}]}>
                                                                    <Text style={styles.colSno}>{i + 1}</Text>
                                                                    <Text style={styles.colTitle}>{r.subject?.subjectName || r.subjectId}</Text>
                                                                    <Text style={styles.colMonth}>{formatMonth(r.academicYear)}</Text>
                                                                    <Text style={styles.colGrade}>{r.grade === 'COMPLE' || r.grade === 'COMPLETED' ? 'CMP' : r.grade}</Text>
                                                                    <Text style={styles.colPts}>{r.gradePoints}</Text>
                                                                    <Text style={styles.colCr}>{r.creditsEarned}</Text>
                                                                </View>
                                                            )
                                                        })}
                                                    </View>

                                                    <View style={styles.gpaBlock}>
                                                        <Text style={styles.gpaText}>SGPA : <Text style={styles.gpaValue}>{sgpa}</Text>        CGPA : <Text style={styles.gpaValue}>{cgpa}</Text></Text>
                                                    </View>
                                                </View>
                                            )
                                        })}
                                    </View>
                                );
                            })}
                        </View>
                    </Page>
                );
            })}
        </Document>
    );
}
