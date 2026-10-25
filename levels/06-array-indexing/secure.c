#include <stdio.h>
#include <stdlib.h>

void secure_index(int idx, int value) {
    int arr[10];
    for (int i = 0; i < 10; i++) arr[i] = i;

    if (idx < 0 || idx >= 10) {
        printf("Rejected: index %d is out of bounds [0, 10)\n", idx);
        return;
    }
    arr[idx] = value;
    printf("arr[%d] = %d\n", idx, arr[idx]);
}

int main(int argc, char *argv[]) {
    if (argc < 3) { printf("Usage: %s <index> <value>\n", argv[0]); return 1; }
    secure_index(atoi(argv[1]), atoi(argv[2]));
    printf("Returned safely.\n");
    return 0;
}
